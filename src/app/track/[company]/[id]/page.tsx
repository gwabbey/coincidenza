import {getActualTrip, getTrip} from "@/api/trenitalia/api";
import {notFound} from "next/navigation";
import Trip from "./trip";

export const revalidate = 0

const clients: Record<number, string> = {
    0: "trenitalia",
    1: "trenitalia",
    2: "trenitalia",
    3: "trenitalia",
    4: "trenitalia",
    18: "trenitalia",
    63: "trenord",
    64: "bahn"
}

export default async function Page({params}: {
    params: Promise<{ company: string, id: string }>
}) {
    const {company, id} = await params;
    if (["trenitalia", "trenord"].indexOf(company) === -1) {
        notFound();
    }

    const data = await getActualTrip(id, company, new Date());

    if (!data) {
        notFound();
    }

    const trip = await getTrip(data.origin, id, data.timestamp);

    if (!trip) {
        notFound();
    }

    return <Trip trip={{...trip, company, originId: data.origin, timestamp: data.timestamp}} />;
}