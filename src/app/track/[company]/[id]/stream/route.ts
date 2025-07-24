import { getTrip } from "@/api/trenitalia/api";
import { createSSEHandler } from "@/app/sse";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ company: string, id: string }> }
) {
    const { company, id } = await params;

    return createSSEHandler(request, id, {
        fetchData: async (id: string) => {
            return await getTrip(id);
        },

        formatForClient: (trip) => ({
            status: trip.status,
            delay: trip.delay,
            lastKnownLocation: trip.lastKnownLocation,
            lastUpdate: trip.lastUpdate,
            currentStopIndex: trip.currentStopIndex,
            stops: trip.stops.map((stop: any) => ({
                id: stop.id,
                name: stop.name,
                scheduledPlatform: stop.scheduledPlatform,
                actualPlatform: stop.actualPlatform,
                scheduledArrival: stop.scheduledArrival,
                actualArrival: stop.actualArrival,
                scheduledDeparture: stop.scheduledDeparture,
                actualDeparture: stop.actualDeparture,
                departureDelay: stop.departureDelay,
                arrivalDelay: stop.arrivalDelay,
                status: stop.status
            }))
        }),

        shouldStopUpdates: (trip) => {
            return trip.status === "completed" || trip.status === "canceled";
        },

        getCompletionMessage: (trip) => {
            return `Trip ${trip.status}, stopping updates`;
        },

        errorMessages: {
            notFound: "Trip not found",
            tooManyErrors: "Too many errors, stopping trip updates",
            temporaryError: "Failed to fetch trip data"
        }
    });
}