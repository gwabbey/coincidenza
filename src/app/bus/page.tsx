import { getClosestBusStops, getStop } from "@/api";
import { Routes } from "@/components/Routes";
import { Stop } from "@/types";
import { Flex, Title } from "@mantine/core";
import { cookies } from "next/headers";
import { Suspense } from "react";

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

    let stops: Stop[];
    let routes;

    if (lat && lon) {
        stops = await getClosestBusStops(lat, lon);
    } else {
        stops = await getClosestBusStops(46.07121658325195, 11.11913776397705);
    }

    const { id, type } = await searchParams;

    if (id && type) {
        routes = await getStop(id, type);
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
            <Suspense fallback={<div>Loading...</div>}>
                <Routes
                    stops={stops}
                    recentStops={JSON.parse(recentStops ?? '[]')}
                    initialRoutes={routes ?? []}
                    initialId={id}
                    initialType={type}
                />
            </Suspense>
        </Flex>
    );
}
