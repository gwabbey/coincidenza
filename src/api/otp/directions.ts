"use server";

import { Coordinates } from '@/types';
import axios from 'axios';
import { getRealtimeData } from './realtime';

const getCode = (leg: any) => {
    if (leg.mode === "rail" && leg.authority?.id === "IT-ITH3-TRENITALIA_L1:Dummy-GMT" && leg.serviceJourney?.id) {
        const match = leg.serviceJourney?.id?.match(/VehicleJourney:\d+-(\d+)-/);
        return match ? match[1] : null;
    }

    return leg.serviceJourney?.publicCode?.split('-').pop().trim() || null;
}

const getLine = (leg: any) => {
    let name = "";
    let code = "";
    let color = "";
    if (leg.line?.name === "REG") code = "R";
    if (leg.authority?.id === "4:1" && leg.line?.publicCode?.startsWith("RE")) code = "RE";
    if (leg.mode === "rail" && leg.authority?.id === "IT-ITH3-TRENITALIA_L1:Dummy-GMT" && leg.serviceJourney?.id) {
        switch (leg.line?.name) {
            case "Regionale Veloce":
                code = "RV";
                name = "Regionale Veloce";
                break;
            case "Regionale":
                code = "R";
                name = "Regionale";
                break;
            default:
                break;
        }
    }

    if (leg.authority?.id && leg.authority?.id.split(":")[0] === "TT_URBANO" && !leg.line?.presentation?.colour) color = "17c964";
    if (leg.authority?.id && leg.authority?.id.split(":")[0] === "TT_EXTRAURBANO" && !leg.line?.presentation?.colour) color = "006FEE";

    return {
        id: leg.line?.id,
        name: name || leg.line?.name,
        code: code || leg.line?.publicCode,
        color: color || leg.line?.presentation?.colour
    }
}

const getStop = (name: string) => {
    const match = name.match(/Stazione di (.+)/i);
    const extracted = match ? match[1] : name;

    return extracted
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase())
        .replace(/([-.])\s*(\w)/g, (_, symbol, char) => `${symbol} ${char.toUpperCase()}`);
}

const processTripData = async (data: { tripPatterns: any[]; nextPageCursor?: string }) => {
    const processedTrips = await Promise.all(data.tripPatterns.map(async (trip) => {
        const processedLegs = await Promise.all(trip.legs.map(async (leg: any) => {
            const realtime = await getRealtimeData(leg.authority?.id, leg.serviceJourney?.id);

            return {
                code: getCode(leg),
                line: getLine(leg),
                destination: leg.toEstimatedCall?.destinationDisplay?.frontText || "",
                points: leg.pointsOnLink.points,
                id: leg.id,
                mode: leg.mode,
                aimedStartTime: leg.aimedStartTime,
                aimedEndTime: leg.aimedEndTime,
                expectedEndTime: leg.expectedEndTime,
                expectedStartTime: leg.expectedStartTime,
                distance: leg.distance,
                intermediateQuays: leg.intermediateQuays.map((quay: any) => ({
                    id: quay.id,
                    name: getStop(quay.name),
                    latitude: quay.latitude,
                    longitude: quay.longitude
                })),
                duration: leg.duration,
                fromPlace: {
                    name: getStop(leg.fromPlace.name),
                    quay: leg.fromPlace.quay?.id,
                    latitude: leg.fromPlace.latitude,
                    longitude: leg.fromPlace.longitude
                },
                toPlace: {
                    name: getStop(leg.toPlace.name),
                    quay: leg.toPlace.quay?.id,
                    latitude: leg.toPlace.latitude,
                    longitude: leg.toPlace.longitude
                },
                authority: leg.authority,
                interchangeTo: leg.interchangeTo,
                interchangeFrom: leg.interchangeFrom,
                tripId: leg.serviceJourney?.id,
                realtime
            };
        }));

        return {
            ...trip,
            legs: processedLegs
        };
    }));

    return {
        trips: processedTrips,
        nextPageCursor: data.nextPageCursor
    }
}

export async function getDirections(
    from: Coordinates,
    to: Coordinates,
    dateTime: string,
    pageCursor?: string,
    maxAttempts = 3
): Promise<any> {
    const fetchData = async (cursor?: string) => {
        const options = {
            method: 'POST',
            url: 'http://localhost:8080/otp/transmodel/v3',
            headers: { 'Content-Type': 'application/json' },
            data: {
                query: 'query trip($from: Location!, $to: Location!, $arriveBy: Boolean, $dateTime: DateTime, $numTripPatterns: Int, $searchWindow: Int, $modes: Modes, $itineraryFiltersDebug: ItineraryFilterDebugProfile, $wheelchairAccessible: Boolean, $pageCursor: String) {trip( from: $from to: $to arriveBy: $arriveBy dateTime: $dateTime numTripPatterns: $numTripPatterns searchWindow: $searchWindow modes: $modes itineraryFilters: {debug: $itineraryFiltersDebug} wheelchairAccessible: $wheelchairAccessible pageCursor: $pageCursor) { previousPageCursor nextPageCursor tripPatterns { aimedStartTime aimedEndTime expectedEndTime expectedStartTime duration distance legs { id serviceJourney { id publicCode } mode aimedStartTime aimedEndTime expectedEndTime expectedStartTime realtime distance intermediateQuays { id name latitude longitude } duration fromPlace { name latitude longitude quay { id } } toPlace { name latitude longitude quay { id } } toEstimatedCall { destinationDisplay { frontText } } line { publicCode name id presentation { colour } } authority { name id } pointsOnLink { points } interchangeTo { staySeated } interchangeFrom { staySeated } } systemNotices { tag } }}}',
                variables: {
                    from: { coordinates: { latitude: from.lat, longitude: from.lon } },
                    to: { coordinates: { latitude: to.lat, longitude: to.lon } },
                    dateTime: dateTime,
                    pageCursor: cursor,
                    searchWindow: 180,
                    numTripPatterns: 3,
                },
                operationName: 'trip'
            }
        };
        const response = await axios.request(options);

        return {
            tripPatterns: response.data.data?.trip?.tripPatterns || [],
            nextPageCursor: response.data.data?.trip?.nextPageCursor
        };
    };

    let attempts = 0;
    let result = await fetchData(pageCursor);

    while (attempts < maxAttempts && result.tripPatterns.length === 0 && result.nextPageCursor != null) {
        attempts++;
        result = await fetchData(result.nextPageCursor);
    }

    return processTripData(result);
}

export async function reverseGeocode(latitude: number, longitude: number, token: string) {
    const response = await axios.get('https://maps-api.apple.com/v1/reverseGeocode', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: { loc: `${latitude},${longitude}`, lang: 'it-IT' }
    });
    return response.data;
}