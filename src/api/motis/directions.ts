"use server";

import {capitalize, getDistance} from '@/utils';
import {getRealTimeData} from './realtime';
import {Directions, Location, Trip} from './types';
import {trainCategoryLongNames} from "@/train-categories";
import {differenceInMinutes} from "date-fns";
import {createAxiosClient} from "@/api/axios";

const axios = createAxiosClient();

const MOTIS = process.env.MOTIS || "http://localhost:8080";

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
                routeColor: originalLeg.routeShortName?.startsWith("R") ? "036633" : originalLeg.source?.includes("ttu") && !originalLeg.routeColor ? "1CC864" : originalLeg.routeColor,
                status: "scheduled"
            };
        }))).filter((leg) => {
            if (!leg.from || !leg.to) {
                return true;
            }

            if (leg.from.lat == null || leg.from.lon == null || leg.to.lat == null || leg.to.lon == null) {
                return true;
            }

            if (leg.from.lat === leg.to.lat && leg.from.lon === leg.to.lon) {
                return false;
            }

            const distance = getDistance(leg.from.lat, leg.from.lon, leg.to.lat, leg.to.lon);

            return distance >= 100;
        });

        return {...trip, legs: processedLegs};
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

const resolvePlace = async (loc: Location): Promise<string> => {
    if (loc.lat != null && loc.lon != null) {
        const {data} = await axios.get(`${MOTIS}/api/v1/reverse-geocode?place=${loc.lat},${loc.lon}&type=STOP`);
        console.log(data[0].id)
        if (data.length > 0) return data[0].id;
        return `${loc.lat},${loc.lon}`;
    }

    throw new Error("unknown location");
};

export async function getDirections(from: Location, to: Location, dateTime: string): Promise<Directions> {
    try {
        const fromPlace = await resolvePlace(from);
        const toPlace = await resolvePlace(to);

        const {data, status} = await axios.get(`${MOTIS}/api/v5/plan`, {
            params: {
                fromPlace,
                toPlace,
                time: dateTime,
                maxPreTransitTime: 1200,
                maxPostTransitTime: 1200,
                maxDirectTime: 3600,
                searchWindow: 7200
            }
        });

        if (status !== 200) {
            console.error("Invalid MOTIS response:", data);
            return {trips: [], pageCursor: "", direct: []};
        }

        return processTripData(data);
    } catch (error: any) {
        console.error("Error fetching directions:", error);
        return {trips: [], pageCursor: "", direct: []};
    }
}