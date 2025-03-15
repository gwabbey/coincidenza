import { getTrip } from "@/api/trenitalia/api";
import { notFound } from "next/navigation";
import Trip from "./trip";

export default async function Page({ params }: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const trip = await getTrip(id);

    if (!trip) notFound();

    return <Trip trip={trip} />;
}