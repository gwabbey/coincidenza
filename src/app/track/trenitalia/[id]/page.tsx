import { getTrip } from "@/api/trenitalia/api";
import { notFound } from "next/navigation";
import { clientNames } from "./client-codes";
import Trip from "./trip";

export default async function Page({ params }: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const trip = await getTrip(id);

    if (!trip) notFound();

    console.log(clientNames[trip.codiceCliente as keyof typeof clientNames])

    // if (clientNames[trip.codiceCliente as keyof typeof clientNames] !== "trenitalia") redirect(`/track/${clientNames[trip.codiceCliente as keyof typeof clientNames]}/${id}`)

    return <Trip trip={trip} />;
}