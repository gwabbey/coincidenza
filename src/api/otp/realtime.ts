import { getTrip } from "../trentino-trasporti/api";
import { Realtime } from "./types";

export async function getRealtimeData(agencyId: string, tripId: string): Promise<Realtime | null> {
    if (agencyId === "1:12" || agencyId === "5:12") {
        const trip = await getTrip(tripId.split(":")[1], tripId.split(":")[0] === "1" ? "E" : "U");
        return {
            delay: trip.delay,
            destination: trip.tripHeadsign,
            alerts: trip.route.news.map((alert: any) => ({
                description: alert.header,
                url: alert.url
            }))
        }
    }
    return null;
}