"use server";

import { agencies } from '@/agencies';
import { trainCategoryLongNames, trainCategoryShortNames } from '@/train-categories';
import { Coordinates } from '@/types';
import { capitalize } from '@/utils';
import axios from 'axios';
import { getRealtimeData } from './realtime';

const OTP_SERVER_IP = process.env.OTP_SERVER_IP || "localhost:8080";

/**
 * Extracts the train/service code from a leg
 */
const getCode = (leg: any): string | null => {
    if (!leg?.serviceJourney?.id) return null;

    const id = leg.serviceJourney.id;

    // Handle TRENITALIA_VENETO format
    if (id.startsWith("TRENITALIA_VENETO")) {
        const match = id.match(/ServiceJourney:\d+-([\w\d]+)-/);
        if (match) return match[1];
        return null;
    }

    // Use publicCode if available
    if (leg.serviceJourney.publicCode) {
        const parts = leg.serviceJourney.publicCode.split('-');
        return parts.length ? parts[parts.length - 1].trim() : null;
    }

    return null;
};

/**
 * Processes line information with consistent formatting and categorization
 */
const getLine = (leg: any) => {
    let name = trainCategoryLongNames[leg.line?.name as keyof typeof trainCategoryLongNames] || leg.line?.name;
    let category = trainCategoryShortNames[leg.line?.name.toLowerCase() as keyof typeof trainCategoryShortNames] || "";
    let color = "";
    const agency = agencies[leg.authority?.id as keyof typeof agencies];

    // Handle specific cases for different agencies
    if (leg.line?.name === "REG") {
        category = "R";
    }

    if (agency === "trenitalia" && leg.serviceJourney?.id) {
        if (leg.line?.name === "Regionale Veloce") category = "RV";
        if (leg.line?.name === "Regionale") category = "R";
    }

    if (agency === "trenord" && leg.line?.publicCode?.startsWith("R")) category = "R";
    if (agency === "trenord" && leg.line?.publicCode?.startsWith("RE")) category = "RE";

    // Default colors for specific agencies
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

/**
 * Cleans and formats station/stop names
 */
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

/**
 * Creates a unique signature for a trip leg to identify duplicates
 */
const getTripLegSignature = (leg: any): string => {
    const code = getCode(leg) || '';
    const agency = agencies[leg.authority?.id as keyof typeof agencies] || '';
    const line = leg.line?.name || '';
    const category = getLine(leg).category || '';
    const trainNumber = leg.serviceJourney?.publicCode || '';

    return `${agency}-${line}-${category}-${code}-${trainNumber}`;
};

/**
 * Generates a signature for the entire trip based on its transit legs
 */
const getTripSignature = (trip: any): string => {
    // Filter to only include transit legs (not walking/cycling)
    const transitLegs = trip.legs.filter((leg: any) =>
        leg.mode !== 'foot' && leg.mode !== 'bicycle');

    if (transitLegs.length === 0) return 'walking-only';

    // Create signature from transit legs
    return transitLegs
        .map(getTripLegSignature)
        .join('|');
};

/**
 * Processes trip data from OTP API into a cleaner format
 */
const processTripData = async (data: { tripPatterns: any[]; nextPageCursor?: string }) => {
    if (!data.tripPatterns || !Array.isArray(data.tripPatterns)) {
        return { trips: [], nextPageCursor: data.nextPageCursor };
    }

    // First pass: Process trips without realtime data for deduplication
    const processedTrips = data.tripPatterns.map((trip) => {
        const processedLegs = trip.legs.map((leg: any) => {
            const agency = agencies[leg.authority?.id as keyof typeof agencies];
            const tripId = agency === "trentino-trasporti"
                ? leg.serviceJourney?.id?.split(":")[1]
                : getCode(leg);

            // Determine transport mode
            const mode = leg.line?.name?.toLowerCase()?.includes("autobus")
                ? "bus"
                : leg.mode;

            return {
                code: getCode(leg),
                line: getLine(leg),
                destination: capitalize(leg.toEstimatedCall?.destinationDisplay?.frontText || ""),
                points: leg.pointsOnLink?.points || [],
                id: leg.id,
                mode: mode,
                aimedStartTime: leg.aimedStartTime,
                aimedEndTime: leg.aimedEndTime,
                expectedStartTime: leg.expectedStartTime || leg.aimedStartTime,
                expectedEndTime: leg.expectedEndTime || leg.aimedEndTime,
                distance: leg.distance,
                intermediateQuays: (leg.intermediateQuays || []).map((quay: any) => {
                    const matchingCall = (leg.intermediateEstimatedCalls || []).find(
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
                duration: leg.duration,
                fromPlace: {
                    name: getStop(leg.fromPlace?.name),
                    quay: leg.fromPlace?.quay?.id,
                    latitude: leg.fromPlace?.latitude,
                    longitude: leg.fromPlace?.longitude,
                },
                toPlace: {
                    name: getStop(leg.toPlace?.name),
                    quay: leg.toPlace?.quay?.id,
                    latitude: leg.toPlace?.latitude,
                    longitude: leg.toPlace?.longitude,
                },
                authority: leg.authority,
                interchangeTo: leg.interchangeTo,
                interchangeFrom: leg.interchangeFrom,
                tripId,
                // Skip realtime data for now
                realtime: null,
            };
        });

        return {
            ...trip,
            legs: processedLegs,
            signature: getTripSignature({ ...trip, legs: processedLegs })
        };
    });

    // Filter out duplicate trips based on signature
    const uniqueTrips = [];
    const seenSignatures = new Set();

    for (const trip of processedTrips) {
        if (!seenSignatures.has(trip.signature)) {
            seenSignatures.add(trip.signature);
            uniqueTrips.push(trip);
        }
    }

    // Second pass: Fetch realtime data only for unique trips
    const tripsWithRealtime = await Promise.all(uniqueTrips.map(async (trip) => {
        const legsWithRealtime = await Promise.all(trip.legs.map(async (leg: any) => {
            // Only fetch realtime data for transit legs
            if (leg.mode !== 'foot' && leg.mode !== 'bicycle' && leg.tripId) {
                const agency = agencies[leg.authority?.id as keyof typeof agencies];
                const realtime = await getRealtimeData(agency, leg.tripId);
                return { ...leg, realtime };
            }
            return leg;
        }));

        return { ...trip, legs: legsWithRealtime };
    }));

    return {
        trips: tripsWithRealtime,
        nextPageCursor: data.nextPageCursor,
        originalTripCount: processedTrips.length,
        uniqueTripCount: uniqueTrips.length
    };
};

/**
 * Main function to get directions between two points
 */
export async function getDirections(
    from: Coordinates,
    to: Coordinates,
    dateTime: string,
    pageCursor?: string,
    maxAttempts = 3
): Promise<any> {
    // GraphQL query for the OTP API
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
                        numTripPatterns: 5, // Increased to get more patterns before deduplication
                    },
                    operationName: 'trip'
                },
                timeout: 10000 // 10 second timeout
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

    // If no results and we have a next page, try additional pages
    while (attempts < maxAttempts && result.tripPatterns.length === 0 && result.nextPageCursor != null) {
        attempts++;
        result = await fetchData(result.nextPageCursor);
    }

    // Process and deduplicate results
    return processTripData(result);
}

/**
 * Function to convert coordinates to address using Apple Maps API
 */
export async function reverseGeocode(latitude: number, longitude: number, token: string) {
    try {
        if (!token) {
            throw new Error("Authentication token is required for reverse geocoding");
        }

        const response = await axios.get('https://maps-api.apple.com/v1/reverseGeocode', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: {
                loc: `${latitude},${longitude}`,
                lang: 'it-IT'
            },
            timeout: 5000 // 5 second timeout
        });

        return response.data;
    } catch (error) {
        console.error("Error performing reverse geocode:", error);
        throw new Error("Failed to perform reverse geocoding");
    }
}