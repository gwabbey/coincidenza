import { getTrip } from "../trentino-trasporti/api";
import { Realtime } from "./types";

export async function getRealtimeData(agencyId: string, tripId: string): Promise<Realtime | null> {
    if (agencyId) {
        if (agencyId.split(":")[1] === "12") {
            const trip = await getTrip(tripId.split(":")[1]);
            return {
                delay: trip.delay,
                destination: trip.tripHeadsign,
                alerts: trip.route.news.map((alert: any) => ({
                    description: alert.header,
                    url: alert.url
                }))
            }
        }
    }
    return {
        delay: null,
        destination: null,
        alerts: null
    }
}