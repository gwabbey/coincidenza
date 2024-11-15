import { getTrip } from "@/api";
import Trip from "@/components/Trip";

export default async function Page({ params }: {
    params: Promise<{ id: string }>
}) {
    const [id, type] = (await params).id.split('%3A');
    const trip = await getTrip(id, type);

    if (!trip) {
        return <div>Corsa non trovata</div>;
    }

    if (!type.includes('E') && !type.includes('U')) {
        return <div>Corsa non trovata</div>;
    }

    return <Trip trip={trip} />;
}