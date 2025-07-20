import { getTrip } from "@/api/trenitalia/api";
import { notFound, redirect } from "next/navigation";
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

export default async function Page({ params }: {
    params: Promise<{ company: string, id: string }>
}) {
    const { company, id } = await params;
    if (["trenitalia", "trenord"].indexOf(company) === -1) {
        notFound();
    }

    const trip = await getTrip(id);

    if (!trip) {
        notFound();
    }

    const vtCompany = clients[trip?.clientId || 0];
    if (company === "trenitalia" && vtCompany === "trenord") {
        redirect(`/track/trenord/${id}`);
    }
    if (company === "trenord" && vtCompany === "trenitalia") {
        redirect(`/track/trenitalia/${id}`);
    }

    return <Trip trip={trip} />;
}