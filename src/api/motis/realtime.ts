import {guessTrip} from "../trenitalia/api";
import {getTripDetails as getTrentinoTrip} from "../trentino-trasporti/api";
import {Leg, RealTime} from "./types";

function getTrackUrl(leg: Leg) {
    if (leg.tripId?.includes("sta") && leg.mode !== "BUS") return `/track/trenitalia/${leg.tripShortName}`
    switch (leg.agencyId) {
        case "12":
            return `/track/trentino-trasporti/${leg.tripId?.split("_")[leg.tripId.split("_").length - 1]}`
        case "TI":
        case "IT:ITH3:Operator:05403151003:Trenitalia:0":
            return `/track/trenitalia/${leg.tripShortName}`
        case "TN":
        case "1":
            return `/track/trenord/${leg.tripShortName}`
        default:
            return "";
    }
}

export async function getRealTimeData(leg: Leg): Promise<RealTime> {
    if (leg.agencyId === "12" && leg.tripId) {
        const trip = await getTrentinoTrip(leg.tripId.split("_")[leg.tripId.split("_").length - 1]);

        return {
            delay: trip?.delay ?? null,
            info: trip?.route?.news
                ?.filter((alert: any) => new Date(alert.endDate) > new Date())
                .map((alert: any) => ({
                    message: alert.details,
                    url: alert.url,
                    source: alert.serviceType ?? "Trentino Trasporti",
                })) || null,
            tracked: trip ? trip.delay !== null : false,
            url: getTrackUrl(leg)
        }
    } else if (["TI", "Trenitalia", "südtirolmobil - altoadigemobilità"].some(s => leg.agencyId?.includes(s)) || leg.agencyId === "1" || leg.agencyId === "TN") {
        const date = new Date(leg.scheduledStartTime);
        date.setHours(0, 0, 0, 0);
        const trip = await guessTrip(leg.tripShortName ?? "", date);

        return {
            delay: trip?.delay ?? null,
            info: trip?.info || null,
            tracked: trip ? trip.delay !== null : false,
            url: getTrackUrl(leg)
        }
    }
    return {
        delay: null,
        info: null,
        tracked: false,
        url: null
    }
}