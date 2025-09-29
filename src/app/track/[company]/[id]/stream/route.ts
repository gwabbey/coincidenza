import {getTrip as getTrenitaliaTrip} from "@/api/trenitalia/api";
// import { getTrip as getTrenordTrip } from "@/api/trenord/api";
import {createSSEHandler} from "@/app/sse";
import {NextRequest} from "next/server";

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ company: string, id: string }> }
) {
    const {company, id} = await params;
    const searchParams = request.nextUrl.searchParams;
    const origin = searchParams.get('origin');
    const timestampStr = searchParams.get('timestamp');
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : undefined;

    const isTrainCompany = company === "trenitalia" || company === "trenord";

    if (isTrainCompany && (!origin || !timestamp)) {
        return new Response(
            JSON.stringify({error: "Origin station and timestamp parameters are required"}),
            {status: 400, headers: {'Content-Type': 'application/json'}}
        );
    }

    return createSSEHandler(request, origin, id, timestamp, {
        fetchData: async (origin: string | null, id: string, timestamp: number | undefined) => {
            if (!origin || timestamp === undefined) {
                throw new Error("Missing required parameters");
            }

            switch (company) {
                case "trenitalia":
                case "trenord":
                    return getTrenitaliaTrip(origin, id, timestamp);
                case "trentino-trasporti":
                    throw new Error("coming soon, just give me a minute");
                default:
                    return getTrenitaliaTrip(origin, id, timestamp);
            }
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
        }
    });
}