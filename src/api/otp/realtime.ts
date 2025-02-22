import { getTrip } from "../trentino-trasporti/api";
import { Realtime } from "./types";

export async function getRealtimeData(agencyId: string, tripId: string): Promise<Realtime | null> {
    if (agencyId === "1:12" || agencyId === "5:12") {
        const trip = await getTrip(tripId.split(":")[1]);
        return {
            delay: trip.delay,
            destination: trip.tripHeadsign
        };
    }
    return null;
}