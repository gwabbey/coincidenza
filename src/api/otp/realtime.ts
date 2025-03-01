import { agencies } from "@/agencies";
import { capitalize } from "@/utils";
import { getTrip as getTrenitaliaTrip } from "../trenitalia/api";
import { getTrip as getTrentinoTrip } from "../trentino-trasporti/api";
import { Realtime } from "./types";

export async function getRealtimeData(agencyId: string, tripId: string): Promise<Realtime | null> {
    if (agencyId) {
        if (agencies[agencyId as keyof typeof agencies] === "trentino-trasporti") {
            const trip = await getTrentinoTrip(tripId);
            return {
                delay: trip.delay,
                destination: trip.tripHeadsign,
                alerts: trip.route?.news?.map((alert: any) => ({
                    description: alert.header,
                    url: alert.url
                }))
            }
        } else if (agencies[agencyId as keyof typeof agencies] === "trenitalia") {
            const trip = await getTrenitaliaTrip(tripId);
            return {
                delay: trip?.ritardo || null,
                destination: trip?.destinazione ? capitalize(trip?.destinazione) : null,
                alerts: trip?.info?.map((alert: any) => ({
                    description: alert.infoNote,
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