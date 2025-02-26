import { getTripDetails } from "@/api/trentino-trasporti/api";
import Trip from "./trip";

function Error({ error }: { error: string }) {
    return <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-2xl font-bold">{error}</div>
    </div>
}

export default async function Page({ params }: {
    params: Promise<{ id: string }>
}) {
    const [, id] = (await params).id.split('%3A');
    const trip = await getTripDetails(id);

    if (!trip) {
        return <Error error="Corsa non trovata" />;
    }

    return <Trip trip={trip} />;
}