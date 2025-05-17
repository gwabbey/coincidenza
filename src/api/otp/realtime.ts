import { getTrip as getTrenitaliaTrip } from "../trenitalia/api";
import { getTrip as getTrentinoTrip } from "../trentino-trasporti/api";

export async function getRealtimeData(agency: string, tripId: string) {
    if (agency === "trentino-trasporti") {
        const trip = await getTrentinoTrip(tripId);
        return {
            delay: trip?.delay ?? null,
            destination: trip?.tripHeadsign || null,
            info: trip?.route?.news?.map((alert: any) => ({
                message: alert.header,
                url: alert.url
            })) || null,
            status: trip ? "tracked" : "not_tracked"
        }
    } else if (agency === "trenitalia" || agency === "trenord") {
        const trip = await getTrenitaliaTrip(tripId);
        return {
            delay: trip?.delay ?? null,
            destination: trip?.destination || null,
            info: trip?.info || null,
            status: trip ? "tracked" : "not_tracked"
        }
    }
    return null;
}