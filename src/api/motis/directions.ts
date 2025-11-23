"use server";

import {capitalize} from '@/utils';
import axios from 'axios';
import {getRealTimeData} from './realtime';
import {Directions, GeocodeRequest, GeocodeResult, Location, Trip} from './types';
import {trainCategoryLongNames} from "@/train-categories";
import {differenceInMinutes} from "date-fns";

const MOTIS = process.env.MOTIS || "http://localhost:8080";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}

const getStop = (name: string): string => {
    if (!name) return "";

    // case 1: "Luogo, Stazione di Luogo" → "Luogo"
    const stazioneDiMatch = name.match(/Stazione di\s+(.+)/i);
    if (stazioneDiMatch) return capitalize(stazioneDiMatch[1]);

    // case 2: "Luogo, Stazione" → "Luogo"
    const luogoStazioneMatch = name.match(/^(.+?),\s*Stazione$/i);
    if (luogoStazioneMatch) return capitalize(luogoStazioneMatch[1]);

    // case 3: "Luogo (Provincia), Luogo" → "Luogo"
    const parensMatch = name.match(/^([^(]+)\s*\(.*?\),\s*\1$/);
    if (parensMatch) return capitalize(parensMatch[1].trim());

    return capitalize(name);
};

function getTripSignature(trip: Trip): string {
    const nonWalkLegs = trip.legs.filter((l) => l.mode !== "WALK");

    if (nonWalkLegs.length === 0) {
        return `WALK_${trip.startTime}_${trip.endTime}`;
    }

    const allHaveShortName = nonWalkLegs.every((l) => l.tripShortName || l.tripId);
    if (allHaveShortName) {
        return nonWalkLegs.map((l) => `${l.tripShortName || l.tripId}_${l.scheduledStartTime}`).join("|");
    }

    return nonWalkLegs
        .map((l) => `${l.from.name}_${l.to.name}_${l.scheduledStartTime}`)
        .join("|");
}

const processTripData = async (data: {
    itineraries: Trip[]; direct: Trip[]; pageCursor?: string
}): Promise<Directions> => {
    if (!data.itineraries || !Array.isArray(data.itineraries) && !data.direct) {
        return {trips: [], pageCursor: data.pageCursor, direct: []};
    }

    const processedItineraries = await Promise.all(data.itineraries.map(async (trip) => {
        console.log(trip)
        const processedLegs = (await Promise.all(trip.legs.map(async (originalLeg) => {
            return {
                ...originalLeg,
                intermediateStops: originalLeg.intermediateStops?.map((stop: any) => ({
                    ...stop, name: getStop(stop.name),
                })),
                headsign: capitalize(originalLeg.headsign || ""),
                routeLongName: originalLeg.mode.includes("RAIL") && originalLeg.routeShortName ? trainCategoryLongNames[originalLeg.routeShortName.trim().toUpperCase()] : capitalize(originalLeg.routeLongName || ""),
                routeShortName: originalLeg.routeShortName && (originalLeg.routeShortName === "REG" ? "R" : originalLeg.routeShortName.split("_")[0]),
                from: {
                    ...originalLeg.from, name: getStop(originalLeg.from.name),
                },
                to: {
                    ...originalLeg.to, name: getStop(originalLeg.to.name),
                },
                tripShortName: originalLeg.tripShortName,
                routeColor: ["R", "REG", "RV"].includes(originalLeg.routeShortName || "") ? "036633" : originalLeg.source?.includes("ttu") && !originalLeg.routeColor ? "1CC864" : originalLeg.routeColor
            };
        }))).filter((leg) => {
            if (!leg.from || !leg.to) return true;
            if (leg.from.lat === leg.to.lat && leg.from.lon === leg.to.lon) return false;
            return getDistance(leg.from.lat, leg.from.lon, leg.to.lat, leg.to.lon) >= 100;
        });

        return {
            ...trip, legs: processedLegs,
        };
    }));

    const seen = new Map<string, Trip>();

    for (const trip of processedItineraries) {
        const signature = getTripSignature(trip);

        if (!seen.has(signature)) {
            seen.set(signature, trip);
        } else {
            const existing = seen.get(signature)!;
            const rtScore = (t: Trip) => (t.legs.some((l) => l.realTime) ? 1 : 0);

            if (rtScore(trip) > rtScore(existing)) {
                seen.set(signature, trip);
                continue;
            }

            const walkCount = trip.legs.filter((l) => l.mode === "WALK").length;
            const existingWalkCount = existing.legs.filter((l) => l.mode === "WALK").length;

            if (walkCount < existingWalkCount) {
                seen.set(signature, trip);
            }
        }
    }

    const trips = await Promise.all(Array.from(seen.values())
        .slice(0, 5)
        .map(async (trip) => {
            const updatedLegs = await Promise.all(trip.legs.map(async (leg) => {
                const realTime = await getRealTimeData(leg);
                return {...leg, realTime};
            }));

            const firstLeg = updatedLegs[0];
            const secondLeg = updatedLegs[1];
            const prevLeg = updatedLegs[updatedLegs.length - 2];
            const lastLeg = updatedLegs[updatedLegs.length - 1];

            const firstStart = firstLeg?.mode !== "WALK" ? new Date(firstLeg.scheduledStartTime).getTime() + (firstLeg.realTime.delay ?? 0) * 60000 : secondLeg?.realTime?.delay ? new Date(firstLeg.scheduledStartTime).getTime() + secondLeg.realTime.delay * 60000 : new Date(firstLeg.startTime).getTime();
            const lastEnd = lastLeg?.mode !== "WALK" ? new Date(lastLeg.scheduledEndTime).getTime() + (lastLeg.realTime.delay ?? 0) * 60000 : prevLeg?.mode !== "WALK" && prevLeg?.realTime?.delay ? new Date(lastLeg.scheduledEndTime).getTime() + prevLeg.realTime.delay * 60000 : new Date(lastLeg.endTime).getTime();
            const duration = differenceInMinutes(new Date(lastEnd), new Date(firstStart));

            return {
                ...trip,
                legs: updatedLegs,
                duration,
                startTime: new Date(firstStart).toISOString(),
                endTime: new Date(lastEnd).toISOString(),
            };
        }));

    return {
        trips, direct: data.direct, pageCursor: data.pageCursor,
    };
};

async function geocodeLocation({lat, lon, text}: GeocodeRequest): Promise<string> {
    try {
        const {data} = await axios.get<GeocodeResult[]>(`${MOTIS}/api/v1/geocode?place=${lat},${lon}&text=${text}&language=it`);

        if (data.length > 0) {
            const best = data[0];
            const dist = getDistance(lat, lon, best.lat, best.lon);

            if (dist <= 250 && best.type === "STOP") {
                return best.id;
            }
        }

        return `${lat},${lon}`;
    } catch (err) {
        console.error("Geocode error:", err);
        return `${lat},${lon}`;
    }
}

export async function getDirections(from: Location, to: Location, dateTime: string, pageCursor?: string): Promise<Directions> {
    try {
        const resolvePlace = async (loc: Location): Promise<string> => {
            if (loc.text.toLowerCase().trim() === "posizione attuale") {
                return `${loc.lat},${loc.lon}`;
            }
            return geocodeLocation(loc);
        };

        const [fromPlace, toPlace] = await Promise.all([resolvePlace(from), resolvePlace(to)]);

        const {
            data,
            status
        } = await axios.get(`${MOTIS}/api/v5/plan?fromPlace=${fromPlace}&toPlace=${toPlace}&time=${dateTime}&maxPreTransitTime=1800&maxPostTransitTime=1800&withFares=false&joinInterlinedLegs=false&maxMatchingDistance=250&useRoutedTransfers=true${pageCursor ? `&pageCursor=${pageCursor}` : ""}`);

        if (status !== 200) {
            console.error("Invalid MOTIS response:", data);
            return {trips: [], pageCursor: "", direct: []};
        }

        return await processTripData(data);
    } catch (error) {
        console.error("Error fetching directions:", error);
        return {trips: [], pageCursor: "", direct: []};
    }
}