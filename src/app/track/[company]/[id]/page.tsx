import {getActualTrip, getTrip} from "@/api/trenitalia/api";
import {notFound} from "next/navigation";
import Train from "./trip/train";
import Bus from "./trip/bus";
import {getTrip as getCiceroTrip} from "@/api/cicero/api";
import {getTripDetails as getTrentinoTrip} from "@/api/trentino-trasporti/api";
import {getTrip as getItaloTrip} from "@/api/italo/api";
import {Metadata} from 'next';

export const revalidate = 60

export const metadata: Metadata = {
    title: "viaggio in tempo reale | coincidenza"
};

export default async function Page({params}: {
    params: Promise<{ company: string, id: string }>
}) {
    const {company, id} = await params;


    if (company === "atv") {
        const trip = await getCiceroTrip("ATV", id, new Date().toISOString());

        if (!trip) {
            notFound();
        }

        return <Bus trip={trip} />;
    }


    if (["trenitalia", "trenord", "trentino-trasporti", "italo"].indexOf(company) === -1) {
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

    if (company === "italo") {
        const trip = await getItaloTrip(id);
        if (!trip) {
            notFound();
        }
        return <Train trip={trip} />
    }

}