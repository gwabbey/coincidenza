"use server";

import { agencies } from '@/agencies';
import { trainCategoryLongNames, trainCategoryShortNames } from '@/train-categories';
import { Coordinates } from '@/types';
import { capitalize } from '@/utils';
import axios from 'axios';
import { getRealtimeData } from './realtime';

const OTP_SERVER_IP = process.env.OTP_SERVER_IP || "localhost:8080";

const WALKING_BYPASS = {
    enabled: true,
    threshold: 500,
    walkingFactor: 1.3,
    walkingSpeed: 1.4
};

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}

function processWalkingLeg(leg: any): any {
    if (!WALKING_BYPASS.enabled || leg.mode !== 'foot') {
        return leg;
    }

    const fromCoords = {
        latitude: leg.fromPlace?.latitude,
        longitude: leg.fromPlace?.longitude
    };

    const toCoords = {
        latitude: leg.toPlace?.latitude,
        longitude: leg.toPlace?.longitude
    };

    const straightLineDistance = calculateHaversineDistance(
        fromCoords.latitude, fromCoords.longitude,
        toCoords.latitude, toCoords.longitude
    );

    if (straightLineDistance <= WALKING_BYPASS.threshold) {
        const estimatedDistance = straightLineDistance * WALKING_BYPASS.walkingFactor;

        const estimatedDuration = Math.ceil(estimatedDistance / WALKING_BYPASS.walkingSpeed);

        console.log(estimatedDistance, estimatedDuration)

        return {
            ...leg,
            distance: estimatedDistance,
            duration: estimatedDuration,
        };
    }

    return leg;
}

const getCode = (leg: any): string | null => {
    if (!leg?.serviceJourney?.id) return null;

    const id = leg.serviceJourney.id;

    if (id.startsWith("TRENITALIA_VENETO")) {
        const match = id.match(/ServiceJourney:\d+-([\w\d]+)-/);
        return match ? match[1] : null;
    }

    if (id.startsWith("STA")) {
        const match = id.match(/:ServiceJourney:[^-]+-TI-(\d+)-/);
        return match ? match[1] : null;
    }

    if (leg.serviceJourney.publicCode) {
        const parts = leg.serviceJourney.publicCode.split('-');
        return parts.length ? parts[parts.length - 1].trim() : null;
    }

    return null;
};

const getLine = (leg: any) => {
    let name = trainCategoryLongNames[leg.line?.name as keyof typeof trainCategoryLongNames];
    let category = trainCategoryShortNames[leg.line?.name.toLowerCase() as keyof typeof trainCategoryShortNames];
    let color = "";
    const agency = agencies[leg.authority?.id as keyof typeof agencies];

    if (leg.line?.name === "REG") {
        category = "R";
    }

    if (agency === "trenitalia" && leg.serviceJourney?.id) {
        if (leg.line?.name === "Regionale Veloce") category = "RV";
        if (leg.line?.name === "Regionale") category = "R";
    }

    if (agency === "trenord" && leg.line?.publicCode?.startsWith("R")) category = "R";
    if (agency === "trenord" && leg.line?.publicCode?.startsWith("RE")) category = "RE";

    if (agency === "trentino-trasporti" && leg.authority?.id?.split(":")[0] === "TT_URBANO" && !leg.line?.presentation?.colour) color = "17c964";
    if (agency === "trentino-trasporti" && leg.authority?.id?.split(":")[0] === "TT_EXTRAURBANO" && !leg.line?.presentation?.colour) color = "006FEE";
    if (agency === "trenitalia" && leg.mode === "rail" && !leg.line?.presentation?.colour) color = "f31260";

    return {
        id: leg.line?.id,
        name: name || leg.line?.name,
        category: category || leg.line?.publicCode,
        color: color || leg.line?.presentation?.colour || "006FEE"
    };
};

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

const processTripData = async (data: { tripPatterns: any[]; nextPageCursor?: string }) => {
    if (!data.tripPatterns || !Array.isArray(data.tripPatterns)) {
        return { trips: [], nextPageCursor: data.nextPageCursor };
    }

    const processedTrips = await Promise.all(
        data.tripPatterns.map(async (trip) => {
            const processedLegs = await Promise.all(trip.legs.map(async (leg: any) => {
                const processedLeg = leg.mode === 'foot' ? processWalkingLeg(leg) : leg;

                const agency = agencies[processedLeg.authority?.id as keyof typeof agencies];
                const tripId = agency === "trentino-trasporti" ? processedLeg.serviceJourney?.id?.split(":")[1] : /[a-zA-Z]/g.test(getCode(processedLeg) || "") ? processedLeg.serviceJourney?.publicCode.split(" ")[1] : getCode(processedLeg);

                const mode = processedLeg.line?.name?.toLowerCase()?.includes("autobus")
                    ? "bus"
                    : processedLeg.mode;

                const realtime = tripId ? await getRealtimeData(agency, tripId) : null;

                const originalDestination = capitalize(processedLeg.toEstimatedCall?.destinationDisplay?.frontText || "");

                return {
                    code: getCode(processedLeg),
                    line: getLine(processedLeg),
                    destination: originalDestination,
                    points: processedLeg.pointsOnLink?.points || [],
                    id: processedLeg.id,
                    mode: mode,
                    aimedStartTime: processedLeg.aimedStartTime,
                    aimedEndTime: processedLeg.aimedEndTime,
                    expectedStartTime: processedLeg.expectedStartTime || processedLeg.aimedStartTime,
                    expectedEndTime: processedLeg.expectedEndTime || processedLeg.aimedEndTime,
                    distance: processedLeg.distance,
                    intermediateQuays: (processedLeg.intermediateQuays || []).map((quay: any) => {
                        const matchingCall = (processedLeg.intermediateEstimatedCalls || []).find(
                            (call: any) => call.quay.id === quay.id
                        );
                        return {
                            id: quay.id,
                            name: getStop(quay.name),
                            latitude: quay.latitude,
                            longitude: quay.longitude,
                            expectedDepartureTime: matchingCall?.expectedDepartureTime || null,
                        };
                    }),
                    duration: processedLeg.duration,
                    fromPlace: {
                        name: getStop(processedLeg.fromPlace?.name),
                        quay: processedLeg.fromPlace?.quay?.id,
                        latitude: processedLeg.fromPlace?.latitude,
                        longitude: processedLeg.fromPlace?.longitude,
                    },
                    toPlace: {
                        name: getStop(processedLeg.toPlace?.name),
                        quay: processedLeg.toPlace?.quay?.id,
                        latitude: processedLeg.toPlace?.latitude,
                        longitude: processedLeg.toPlace?.longitude,
                    },
                    authority: processedLeg.authority,
                    interchangeTo: processedLeg.interchangeTo,
                    interchangeFrom: processedLeg.interchangeFrom,
                    tripId,
                    realtime,
                    destinationMismatch: realtime?.destination &&
                        originalDestination &&
                        realtime.destination !== originalDestination
                };
            }));

            const hasDestinationMismatch = processedLegs.some(
                leg => leg.mode !== 'foot' && leg.destinationMismatch
            );

            const totalDuration = processedLegs.reduce((sum, leg) => sum + leg.duration, 0);
            const totalDistance = processedLegs.reduce((sum, leg) => sum + leg.distance, 0);

            return {
                ...trip,
                legs: processedLegs,
                duration: totalDuration,
                distance: totalDistance,
                hasDestinationMismatch
            };
        })
    );

    const filteredTrips = processedTrips.filter(trip => !trip.hasDestinationMismatch);

    return {
        trips: filteredTrips,
        nextPageCursor: data.nextPageCursor,
    };
};

export async function getDirections(
    from: Coordinates,
    to: Coordinates,
    dateTime: string,
    pageCursor?: string,
    maxAttempts = 3
): Promise<any> {
    const graphqlQuery = `
        query trip(
            $from: Location!, 
            $to: Location!, 
            $arriveBy: Boolean, 
            $dateTime: DateTime, 
            $numTripPatterns: Int, 
            $searchWindow: Int, 
            $modes: Modes, 
            $itineraryFiltersDebug: ItineraryFilterDebugProfile, 
            $wheelchairAccessible: Boolean, 
            $pageCursor: String
        ) {
            trip(
                from: $from 
                to: $to 
                arriveBy: $arriveBy 
                dateTime: $dateTime 
                numTripPatterns: $numTripPatterns 
                searchWindow: $searchWindow 
                modes: $modes 
                itineraryFilters: {debug: $itineraryFiltersDebug} 
                wheelchairAccessible: $wheelchairAccessible 
                pageCursor: $pageCursor
            ) { 
                previousPageCursor 
                nextPageCursor 
                tripPatterns { 
                    aimedStartTime 
                    aimedEndTime 
                    expectedEndTime 
                    expectedStartTime 
                    duration 
                    distance 
                    legs { 
                        id 
                        serviceJourney { 
                            id 
                            publicCode 
                        } 
                        mode 
                        aimedStartTime 
                        aimedEndTime 
                        expectedEndTime 
                        expectedStartTime 
                        realtime 
                        distance 
                        intermediateEstimatedCalls { 
                            quay { id } 
                            expectedDepartureTime 
                        } 
                        intermediateQuays { 
                            id 
                            name 
                            latitude 
                            longitude 
                        } 
                        duration 
                        fromPlace { 
                            name 
                            latitude 
                            longitude 
                            quay { id } 
                        } 
                        toPlace { 
                            name 
                            latitude 
                            longitude 
                            quay { id } 
                        } 
                        toEstimatedCall { 
                            destinationDisplay { 
                                frontText 
                            } 
                        } 
                        line { 
                            publicCode 
                            name 
                            id 
                            presentation { 
                                colour 
                            } 
                        } 
                        authority { 
                            name 
                            id 
                        } 
                        pointsOnLink { 
                            points 
                        } 
                        interchangeTo { 
                            staySeated 
                        } 
                        interchangeFrom { 
                            staySeated 
                        } 
                    } 
                    systemNotices { 
                        tag 
                    } 
                }
            }
        }
    `;

    const fetchData = async (cursor?: string) => {
        try {
            const options = {
                method: 'POST',
                url: `http://${OTP_SERVER_IP}/otp/transmodel/v3`,
                headers: { 'Content-Type': 'application/json' },
                data: {
                    query: graphqlQuery,
                    variables: {
                        from: { coordinates: { latitude: from.lat, longitude: from.lon } },
                        to: { coordinates: { latitude: to.lat, longitude: to.lon } },
                        dateTime: dateTime,
                        pageCursor: cursor,
                        searchWindow: 180,
                        numTripPatterns: 4,
                    },
                    operationName: 'trip'
                },
                timeout: 10000
            };

            const response = await axios.request(options);

            if (!response.data?.data?.trip) {
                console.error("Invalid response format from OTP server:", response.data);
                return { tripPatterns: [], nextPageCursor: null };
            }

            return {
                tripPatterns: response.data.data.trip.tripPatterns || [],
                nextPageCursor: response.data.data.trip.nextPageCursor
            };
        } catch (error) {
            console.error("Error fetching directions:", error);
            return { tripPatterns: [], nextPageCursor: null };
        }
    };

    let attempts = 0;
    let result = await fetchData(pageCursor);

    while (attempts < maxAttempts && result.tripPatterns.length === 0 && result.nextPageCursor != null) {
        attempts++;
        result = await fetchData(result.nextPageCursor);
    }

    return processTripData(result);
}
