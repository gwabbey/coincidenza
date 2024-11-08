import {getTrip} from "@/api";
import Trip from "@/components/Trip";

export default async function Page({
                                       params,
                                   }: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const trip = await getTrip(id);

    if (!trip) {
        return "Connessione persa.";
    }

    return <Trip trip={trip} tripId={id} />;
}