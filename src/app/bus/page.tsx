import { getClosestBusStops, getRoutes, getStop } from "@/api";
import { Routes } from "@/components/Routes";
import { Stop } from "@/types";
import { Flex, Title } from "@mantine/core";
import { cookies } from "next/headers";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        id?: string;
        type?: string;
    }>;
}) {
    const [lat, lon, recentStops] = await Promise.all([
        cookies().then((cookies) => cookies.get('lat')?.value),
        cookies().then((cookies) => cookies.get('lon')?.value),
        cookies().then((cookies) => cookies.get('recentStops')?.value),
    ]);

    let closestStops: Stop[];
    let stop;

    if (lat && lon) {
        closestStops = await getClosestBusStops(lat, lon);
    } else {
        closestStops = await getClosestBusStops(46.07121658325195, 11.11913776397705);
    }

    const { id, type } = await searchParams;

    const routes = await getRoutes(type);

    if (id && type) {
        stop = await getStop(id, type, routes);
    }

    return (
        <Flex
            justify="center"
            direction="column"
            wrap="wrap"
            ta="center"
            gap="md"
        >
            <Title order={1} maw={750} w="100%" mx="auto">
                Cerca fermata
            </Title>
            <Routes
                stops={closestStops}
                recentStops={JSON.parse(recentStops ?? '[]')}
                initialRoutes={stop ?? []}
                initialId={id}
                initialType={type}
            />
        </Flex>
    );
}
