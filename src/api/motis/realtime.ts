import {guessTrip} from "../trenitalia/api";
import {getTripDetails as getTrentinoTrip} from "../trentino-trasporti/api";
import {Leg, RealTime} from "./types";
import {differenceInMinutes} from "date-fns";

function getTrackUrl(leg: Leg) {
    if (leg.tripId?.includes("sta") && leg.mode !== "BUS") return `/track/trenitalia/${leg.tripShortName}`
    switch (leg.agencyName?.toLowerCase()) {
        case "trentino trasporti s.p.a.":
            return `/track/trentino-trasporti/${leg.tripId?.split("_")[leg.tripId.split("_").length - 1]}`
        case "gab":
        case "trenitalia":
            return `/track/trenitalia/${leg.tripShortName}`
        case "trenord":
            return `/track/trenord/${leg.tripShortName}`
        default:
            return "";
    }
}

export async function getRealTimeData(leg: Leg): Promise<RealTime> {
    if (leg.agencyId === "12" && leg.tripId) {
        const trip = await getTrentinoTrip(leg.tripId.split("_")[leg.tripId.split("_").length - 1]);

        return {
            delay: trip?.delay ?? null, info: trip?.route?.news
                ?.filter((alert: any) => new Date(alert.endDate) > new Date())
                .map((alert: any) => ({
                    message: alert.details, url: alert.url, source: alert.serviceType ?? "Trentino Trasporti",
                })) || null, tracked: trip ? trip.delay !== null : false, url: getTrackUrl(leg)
        }
    } else if (["TI", "Trenitalia", "südtirolmobil - altoadigemobilità"].some(s => leg.agencyId?.includes(s)) || leg.agencyId === "1" || leg.agencyId === "TN") {
        const date = new Date(leg.scheduledStartTime);
        date.setHours(0, 0, 0, 0);

        // handle trains (leg has tripShortName)
        if (leg.tripShortName !== "") {
            const trip = await guessTrip(leg.tripShortName ?? "", date);

            return {
                delay: trip?.delay ?? null,
                info: trip?.info || [],
                tracked: trip ? trip.delay !== null : false,
                url: getTrackUrl(leg)
            }
        }

        // handle STA realtime buses
        if (leg.from.departure !== leg.from.scheduledDeparture) {
            const delay = differenceInMinutes(new Date(leg.from.departure), new Date(leg.from.scheduledDeparture));

            return {
                delay, info: [], tracked: true, url: null
            }
        }

    }
    return {
        delay: null, info: [], tracked: false, url: null
    }
}