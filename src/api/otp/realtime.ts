import { agencies } from "@/agencies";
import { getTrip as getTrenitaliaTrip } from "../trenitalia/api";
import { getTrip as getTrentinoTrip } from "../trentino-trasporti/api";

export async function getRealtimeData(agencyId: string, tripId: string) {
    if (agencyId) {
        if (agencies[agencyId as keyof typeof agencies] === "trentino-trasporti") {
            const trip = await getTrentinoTrip(tripId);
            return {
                delay: trip.delay,
                destination: trip.tripHeadsign,
                info: trip.route?.news?.map((alert: any) => ({
                    description: alert.header,
                    url: alert.url
                }))
            }
        } else if (agencies[agencyId as keyof typeof agencies] === "trenitalia") {
            const trip = await getTrenitaliaTrip(tripId);
            return {
                delay: trip?.delay || null,
                destination: trip?.destination || null,
                info: trip?.info || null
            }
        }
    }
}