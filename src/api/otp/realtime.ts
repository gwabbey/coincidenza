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

export function isTripCatchable(
    tripPattern: any,
    selectedDateTime: Date
): boolean {
    const selectedTime = selectedDateTime.getTime();
    const legs = tripPattern.legs;
    if (!legs || legs.length < 1) return false;

    const firstLeg = legs[0];

    if (firstLeg.mode !== 'foot') {
        const transportLeg = firstLeg;
        const scheduledTime = transportLeg.aimedStartTime || transportLeg.expectedStartTime;
        if (!scheduledTime) return false;

        const baseDeparture = new Date(scheduledTime).getTime();
        const delay = transportLeg.realTime?.delay;
        const departureTime = delay == null ? baseDeparture : baseDeparture + delay * 60000;
        console.log(departureTime)

        return selectedTime <= departureTime;
    }

    // walking first
    if (firstLeg.distance > 1000) return false;
    if (legs.length < 2 || legs[1].mode === 'foot') return false;

    const secondLeg = legs[1];
    const scheduledTime = secondLeg.aimedStartTime || secondLeg.expectedStartTime;
    console.log(scheduledTime)
    if (!scheduledTime) return false;

    const baseDeparture = new Date(scheduledTime).getTime();
    const delay = secondLeg.realTime?.delay;
    const departureTime = delay == null ? baseDeparture : baseDeparture + delay * 60000;

    const walkingTimeMs = firstLeg.duration * 1000;
    const arrivalTimeAtStation = selectedTime + walkingTimeMs;

    return arrivalTimeAtStation <= departureTime;
}