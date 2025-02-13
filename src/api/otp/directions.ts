"use server";

import { Coordinates } from '@/types';
import axios from 'axios';

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
                query: 'query trip($from: Location!, $to: Location!, $arriveBy: Boolean, $dateTime: DateTime, $numTripPatterns: Int, $searchWindow: Int, $modes: Modes, $itineraryFiltersDebug: ItineraryFilterDebugProfile, $wheelchairAccessible: Boolean, $pageCursor: String) {\n  trip(\n    from: $from\n    to: $to\n    arriveBy: $arriveBy\n    dateTime: $dateTime\n    numTripPatterns: $numTripPatterns\n    searchWindow: $searchWindow\n    modes: $modes\n    itineraryFilters: {debug: $itineraryFiltersDebug}\n    wheelchairAccessible: $wheelchairAccessible\n    pageCursor: $pageCursor\n  ) {\n    previousPageCursor\n    nextPageCursor\n    tripPatterns {\n      aimedStartTime\n      aimedEndTime\n      expectedEndTime\n      expectedStartTime\n      duration\n      distance\n      legs {\n        id\n        serviceJourney {\n          id\n          publicCode\n        }\n        mode\n        aimedStartTime\n        aimedEndTime\n        expectedEndTime\n        expectedStartTime\n        realtime\n        distance\n intermediateQuays {\n          id\n          name\n        }\n                duration\n        fromPlace {\n          name\n          quay {\n            id\n          }\n        }\n        toPlace {\n          name\n          quay {\n            id\n          }\n        }\n        toEstimatedCall {\n          destinationDisplay {\n            frontText\n          }\n        }\n        line {\n          publicCode\n          name\n          id\n          presentation {\n            colour\n          }\n        }\n        authority {\n          name\n          id\n        }\n        pointsOnLink {\n          points\n        }\n        interchangeTo {\n          staySeated\n        }\n        interchangeFrom {\n          staySeated\n        }\n      }\n      systemNotices {\n        tag\n      }\n    }\n  }\n}',
                variables: {
                    from: { coordinates: { latitude: from.lat, longitude: from.lon } },
                    to: { coordinates: { latitude: to.lat, longitude: to.lon } },
                    dateTime: dateTime,
                    pageCursor: cursor,
                    searchWindow: 180,
                    numTripPatterns: 5,
                },
                operationName: 'trip'
            }
        };
        const response = await axios.request(options);
        return response.data.data.trip;
    };

    let attempts = 0;
    let result = await fetchData(pageCursor);

    while (
        attempts < maxAttempts &&
        result.tripPatterns.length === 0 &&
        result.nextPageCursor
    ) {
        attempts++;
        result = await fetchData(result.nextPageCursor);
    }

    return result;
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