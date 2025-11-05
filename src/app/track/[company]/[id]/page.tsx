import {getActualTrip, getTrip} from "@/api/trenitalia/api";
import {notFound} from "next/navigation";
import Train from "./trip/train";
import Bus from "./trip/bus";
import {getTripDetails as getTrentinoTrip} from "@/api/trentino-trasporti/api";

export const revalidate = 0

export default async function Page({params}: {
    params: Promise<{ company: string, id: string }>
}) {
    const {company, id} = await params;
    if (["trenitalia", "trenord", "trentino-trasporti"].indexOf(company) === -1) {
        notFound();
    }

    if (["trenitalia", "trenord"].indexOf(company) > -1) {
        const data = await getActualTrip(id, company);

        if (!data) {
            notFound();
        }

        const trip = await getTrip(data.origin, id, data.timestamp);

        if (!trip) {
            notFound();
        }

        return <Train trip={{...trip, company, originId: data.origin, timestamp: data.timestamp}} />;
    }

    if (company === "trentino-trasporti") {
        const trip = await getTrentinoTrip(id);
        if (!trip) {
            notFound();
        }
        return <Bus trip={trip} />
    }

}