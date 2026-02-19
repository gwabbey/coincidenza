"use server";

import {capitalize, getDistance, getTripColor} from '@/utils';
import {Directions, Leg, Location, RealTime, Trip} from './types';
import {trainCategoryLongNames} from "@/train-categories";
import {differenceInMinutes} from "date-fns";
import {createAxiosClient} from "@/api/axios";
import {getRailPolyline} from "@/api/signal/api";
import {getRoadPolyline} from "@/api/valhalla/api";
import {getTripDetails as getTrentinoTrip} from "../trentino-trasporti/api";
import {guessTrip} from "@/api/trenitalia/api";
import {getTrip as getCiceroTrip} from "@/api/cicero/api";

const axios = createAxiosClient();

const MOTIS = process.env.MOTIS || "http://localhost:8080";

const getStop = (name: string): string => {
    if (!name) return "";

    const stazioneDiMatch = name.match(/Stazione di\s+(.+)/i);
    if (stazioneDiMatch) return capitalize(stazioneDiMatch[1]);

    const luogoStazioneMatch = name.match(/^(.+?),\s*Stazione$/i);
    if (luogoStazioneMatch) return capitalize(luogoStazioneMatch[1]);

    const parensMatch = name.match(/^([^(]+)\s*\(.*?\),\s*\1$/);
    if (parensMatch) return capitalize(parensMatch[1].trim());

    return capitalize(name);
};

function getSignature(trip: Trip): string {
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

async function getShapes(leg: any): Promise<string> {
    const stops = [leg.from, ...(leg.intermediateStops ?? []), leg.to].filter(Boolean);
    if (leg.mode?.includes("RAIL")) {
        return await getRailPolyline(stops);
    }

    if (leg.mode?.includes("BUS")) {
        return await getRoadPolyline(stops, leg.legGeometry.points);
    }

    return leg.legGeometry.points ?? "";
}

function getTrackUrl(leg: Leg) {
    if (leg.tripId?.includes("sta") && leg.mode !== "BUS") return `/track/trenitalia/${leg.tripShortName}`;

    switch (leg.agencyName?.toLowerCase()) {
        case "trentino trasporti s.p.a.":
            return `/track/trentino-trasporti/${leg.tripId?.split("_")[leg.tripId.split("_").length - 1]}`
        case "azienda trasporti verona s.p.a.":
            return `/track/atv/${leg.tripId?.split(":")[leg.tripId.split(":").length - 1].replace("_ATV", "")}`
        case "trenitalia":
            return `/track/trenitalia/${leg.tripShortName}`
        case "trenord":
            return `/track/trenord/${leg.tripShortName}`
        default:
            return "";
    }
}

export async function getRealTimeData(leg: Leg): Promise<RealTime> {
    if (leg.tripId) {
        switch (leg.agencyName?.toLowerCase()) {
            case "trentino trasporti s.p.a.":
                const trip = await getTrentinoTrip(leg.tripId.split("_")[leg.tripId.split("_").length - 1]);

                return {
                    delay: trip?.delay ?? null,
                    info: trip?.info ?? [],
                    tracked: trip ? trip.delay !== null : false,
                    url: getTrackUrl(leg),
                    status: trip?.status ?? "scheduled"
                }

            case "azienda trasporti verona s.p.a.":
                const atvTrip = await getCiceroTrip("ATV", leg.tripId.split(":")[leg.tripId.split(":").length - 1].replace("_ATV", ""), new Date().toISOString());
                return {
                    delay: atvTrip?.delay ?? null,
                    info: atvTrip?.info ?? [],
                    tracked: atvTrip ? atvTrip.delay !== null : false,
                    url: getTrackUrl(leg),
                    status: atvTrip?.status ?? "scheduled"
                }
            case "trenitalia":
            case "altoadigemobilità":
            case "trenord":
                const date = new Date(leg.scheduledStartTime);
                date.setHours(0, 0, 0, 0);

                if (leg.tripShortName !== "") {
                    const trip = await guessTrip(leg.tripShortName ?? "", date);

                    return {
                        delay: trip?.delay ?? null,
                        info: trip?.info ?? [],
                        tracked: trip ? trip.delay !== null : false,
                        url: getTrackUrl(leg),
                        status: trip?.status ?? "scheduled"
                    }
                }

                if (leg.from.departure !== leg.from.scheduledDeparture) {
                    const delay = differenceInMinutes(new Date(leg.from.departure), new Date(leg.from.scheduledDeparture));

                    return {
                        delay, info: [], tracked: true, url: null, status: "active"
                    }
                }
        }
    }
    return {
        delay: null, info: [], tracked: false, url: null, status: "scheduled"
    }
}

function getRouteLongName(leg: Leg) {
    const route = leg.agencyName == "altoadigemobilità" ? leg.routeLongName : leg.routeShortName;

    if (leg.mode.includes("RAIL") && route) {
        if (leg.agencyName?.toLowerCase() == "trentino trasporti s.p.a.") {
            return "Regionale Trentino Trasporti";
        }

        return trainCategoryLongNames[route.trim().toUpperCase()]
    }

    return capitalize(leg.routeLongName || "")
}

const processTripData = async (data: {
    itineraries: Trip[]; direct: Trip[]; pageCursor?: string
}): Promise<Directions> => {
    if (!data.itineraries || !Array.isArray(data.itineraries) && !data.direct) {
        return {trips: [], pageCursor: data.pageCursor, direct: []};
    }
    const processedItineraries = await Promise.all(data.itineraries.filter((trip) => {
        return !trip.legs.some((leg: any) => leg.mode === "WALK" && leg.duration > 3600);
    }).map(async (trip) => {
        const processedLegs = (await Promise.all(trip.legs.map(async (originalLeg) => {
            const points = await getShapes(originalLeg);
            const route = originalLeg.agencyName == "altoadigemobilità" ? originalLeg.displayName : originalLeg.routeShortName;
            const routeLongName = getRouteLongName(originalLeg)

            return {
                ...originalLeg,
                legGeometry: {
                    points,
                    precision: originalLeg.legGeometry.precision ?? 0,
                    length: originalLeg.legGeometry.length ?? 0,
                },
                intermediateStops: originalLeg.intermediateStops?.map((stop: any) => ({
                    ...stop, name: getStop(stop.name)
                })),
                headsign: capitalize(originalLeg.headsign || ""),
                routeLongName,
                routeShortName: route && (route === "REG" ? "R" : route.startsWith("RE") ? "RE" : route.startsWith("R") ? "R" : route.startsWith("S") ? "S" : route.split("_")[0]),
                from: {
                    ...originalLeg.from, name: getStop(originalLeg.from.name),
                },
                to: {
                    ...originalLeg.to, name: getStop(originalLeg.to.name),
                },
                tripShortName: originalLeg.tripShortName,
                routeColor: !originalLeg.routeColor && route && originalLeg.source ? getTripColor(route, originalLeg.source) : originalLeg.routeColor,
                status: "scheduled",
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
        const signature = getSignature(trip);

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
            const isToday = (date: Date) => {
                const now = new Date();
                return (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate());
            };

            const tripStart = new Date(trip.startTime);
            const fetchRealtime = isToday(tripStart);

            const updatedLegs = await Promise.all(trip.legs.map(async (leg) => {
                if (!fetchRealtime) {
                    return {
                        ...leg, realTime: {
                            delay: null, info: [], tracked: false, url: "", status: "scheduled"
                        }
                    };
                }

                const realTime = await getRealTimeData(leg);
                return {...leg, realTime};
            }));

            const firstLeg = updatedLegs[0];
            const secondLeg = updatedLegs[1];
            const prevLeg = updatedLegs[updatedLegs.length - 2];
            const lastLeg = updatedLegs[updatedLegs.length - 1];

            const firstStart = firstLeg?.mode !== "WALK" ? new Date(firstLeg.scheduledStartTime).getTime() + (firstLeg.realTime?.delay ?? 0) * 60000 : secondLeg?.realTime?.delay ? new Date(firstLeg.scheduledStartTime).getTime() + secondLeg.realTime.delay * 60000 : new Date(firstLeg.startTime).getTime();
            const lastEnd = lastLeg?.mode !== "WALK" ? new Date(lastLeg.scheduledEndTime).getTime() + (lastLeg.realTime?.delay ?? 0) * 60000 : prevLeg?.mode !== "WALK" && prevLeg?.realTime?.delay ? new Date(lastLeg.scheduledEndTime).getTime() + prevLeg.realTime.delay * 60000 : new Date(lastLeg.endTime).getTime();
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
    if (loc.lat == null || loc.lon == null) {
        throw new Error("unknown location");
    }

    const {data} = await axios.get(`${MOTIS}/api/v1/reverse-geocode`, {
        params: {
            place: `${loc.lat},${loc.lon}`, type: "STOP",
        },
    });

    if (Array.isArray(data) && data.length > 0) {
        const stop = data[0];
        const dist = getDistance(Number(loc.lat), Number(loc.lon), Number(stop.lat), Number(stop.lon));

        if (dist <= 100) {
            return `${stop.lat},${stop.lon}`;
        }
    }

    return `${loc.lat},${loc.lon}`;
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
                maxPreTransitTime: 3600,
                maxPostTransitTime: 3600,
                maxDirectTime: 3600,
                numItineraries: 5,
                algorithm: "RAPTOR"
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