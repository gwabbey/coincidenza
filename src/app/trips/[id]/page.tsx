import { getRoutes, getTrip } from "@/api";
import Trip from "@/components/Trip";
import { Center, Title } from "@mantine/core";

function Error({ error }: { error: string }) {
    return <Center>
        <Title order={1} my="xl">{error}</Title>
    </Center>
}

export default async function Page({ params }: {
    params: Promise<{ id: string }>
}) {
    const [id, type] = (await params).id.split('%3A');
    const trip = await getTrip(id, type);
    const routes = await getRoutes(type);

    if (!trip) {
        return <Error error="Corsa non trovata" />;
    }

    if (!type || !type.includes('E') && !type.includes('U')) {
        return <Error error="Corsa non valida" />;
    }

    return <Trip trip={trip} routes={routes} />;
}