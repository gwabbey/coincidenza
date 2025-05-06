"use server";

import { agencies } from '@/agencies';
import { trainCategoryLongNames, trainCategoryShortNames } from '@/train-categories';
import { Coordinates } from '@/types';
import { capitalize } from '@/utils';
import axios from 'axios';
import { getRealtimeData } from './realtime';

const OTP_SERVER_IP = process.env.OTP_SERVER_IP || "localhost:8080";

// Configuration for walking bypass
const WALKING_BYPASS = {
    enabled: true,
    threshold: 500, // meters
    walkingFactor: 1.3, // multiplier for straight-line distance
    walkingSpeed: 1.4, // m/s
};

/**
 * Calculate Haversine distance between two points in meters
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}

/**
 * Process walking legs to bypass OTP for short distances
 */
function processWalkingLeg(leg: any): any {
    // Skip if bypass is disabled or this isn't a walking leg
    if (!WALKING_BYPASS.enabled || leg.mode !== 'foot') {
        return leg;
    }

    // Get coordinates
    const fromCoords = {
        latitude: leg.fromPlace?.latitude,
        longitude: leg.fromPlace?.longitude
    };

    const toCoords = {
        latitude: leg.toPlace?.latitude,
        longitude: leg.toPlace?.longitude
    };

    // Calculate straight-line distance
    const straightLineDistance = calculateHaversineDistance(
        fromCoords.latitude, fromCoords.longitude,
        toCoords.latitude, toCoords.longitude
    );

    // If within threshold, replace with straight-line estimate
    if (straightLineDistance <= WALKING_BYPASS.threshold) {
        // Estimate actual walking distance with factor
        const estimatedDistance = straightLineDistance * WALKING_BYPASS.walkingFactor;

        // Calculate estimated duration in seconds
        const estimatedDuration = Math.ceil(estimatedDistance / WALKING_BYPASS.walkingSpeed);

        // Update leg with our estimates
        return {
            ...leg,
            distance: estimatedDistance,
            duration: estimatedDuration,
            // Flag this leg as externally routed
            useExternalDirections: true,
        };
    }

    return leg;
}

/**
 * Extracts the train/service code from a leg
 */
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
 * Processes trip data from OTP API into a cleaner format with destination filtering
 */
const processTripData = async (data: { tripPatterns: any[]; nextPageCursor?: string }) => {
    if (!data.tripPatterns || !Array.isArray(data.tripPatterns)) {
        return { trips: [], nextPageCursor: data.nextPageCursor };
    }

    // Process all trips and filter those with destination mismatches
    const processedTrips = await Promise.all(
        data.tripPatterns.map(async (trip) => {
            // Process each leg, handling walking segments specially
            const processedLegs = await Promise.all(trip.legs.map(async (leg: any) => {
                // Apply walking bypass for foot segments
                const processedLeg = leg.mode === 'foot' ? processWalkingLeg(leg) : leg;

                const agency = agencies[processedLeg.authority?.id as keyof typeof agencies];
                const tripId = agency === "trentino-trasporti" ? processedLeg.serviceJourney?.id?.split(":")[1] : /[a-zA-Z]/g.test(getCode(processedLeg) || "") ? processedLeg.serviceJourney?.publicCode.split(" ")[1] : getCode(processedLeg);

                // Determine transport mode
                const mode = processedLeg.line?.name?.toLowerCase()?.includes("autobus")
                    ? "bus"
                    : processedLeg.mode;

                // Get realtime data if available
                const realtime = tripId ? await getRealtimeData(agency, tripId) : null;

                // Get the original destination
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
                    // Rest of the properties...
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
                    // Flag for destination mismatch
                    destinationMismatch: realtime?.destination &&
                        originalDestination &&
                        realtime.destination !== originalDestination,
                    useExternalDirections: processedLeg.useExternalDirections,
                    externalDirectionsUrl: processedLeg.externalDirectionsUrl
                };
            }));

            // Check if any non-walking leg has a destination mismatch
            const hasDestinationMismatch = processedLegs.some(
                leg => leg.mode !== 'foot' && leg.destinationMismatch
            );

            // Update trip duration and distance based on modified legs
            const totalDuration = processedLegs.reduce((sum, leg) => sum + leg.duration, 0);
            const totalDistance = processedLegs.reduce((sum, leg) => sum + leg.distance, 0);

            return {
                ...trip,
                legs: processedLegs,
                duration: totalDuration,
                distance: totalDistance,
                hasDestinationMismatch // Add flag to the trip
            };
        })
    );

    // Filter out trips with destination mismatches
    const filteredTrips = processedTrips.filter(trip => !trip.hasDestinationMismatch);

    return {
        trips: filteredTrips,
        nextPageCursor: data.nextPageCursor,
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
                        numTripPatterns: 4,
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