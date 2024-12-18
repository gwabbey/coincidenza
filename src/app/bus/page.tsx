import { getClosestBusStops, getRoutes, getStopTrips } from "@/api";
import { Routes } from "@/components/Routes";
import { RecentStops } from "@/components/stops/recent-stops";
import { StopSearch } from "@/components/stops/stop-search";
import { Stop } from "@/types";
import { Box, Title } from "@mantine/core";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { BusSkeleton } from "./bus-skeleton";

export const revalidate = 0;

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        id?: string;
        type?: string;
    }>;
}) {
    const { id, type } = await searchParams;
    const routes = await getRoutes(type);

    const [lat, lon, recentStops, sort] = await Promise.all([
        cookies().then((cookies) => cookies.get('lat')?.value),
        cookies().then((cookies) => cookies.get('lon')?.value),
        cookies().then((cookies) => cookies.get('recentStops')?.value),
        cookies().then((cookies) => cookies.get('sort')?.value),
    ]);

    let closestStops: Stop[];

    if (lat && lon) {
        closestStops = await getClosestBusStops(lat, lon);
    } else {
        closestStops = await getClosestBusStops(46.07121658325195, 11.11913776397705);
    }

    return (
        <Box maw={750} w="100%" mx="auto">
            <Title order={1} maw={750} w="100%" mx="auto" ta="center">
                Cerca fermata
            </Title>

            <StopSearch
                stops={closestStops}
            />

            <Suspense fallback={<BusSkeleton />} key={id}>
                <PageBus id={id} type={type} routes={routes} closestStops={closestStops} recentStops={recentStops} sort={sort || "time"} />
            </Suspense>
        </Box>
    );
}

async function PageBus({
    id,
    type,
    routes,
    closestStops,
    recentStops,
    sort,
}: {
    id: string | undefined;
    type: string | undefined;
    routes: string[];
    closestStops: Stop[];
    recentStops: string | undefined;
    sort: string;
}) {
    const stop = id && type && routes ? await getStopTrips(id, type, routes) : undefined;

    if (!stop) {
        return <RecentStops recentStops={recentStops} closestStops={closestStops} />
    }

    return (
        <Routes
            stops={closestStops}
            stop={stop || { stopId: 0, type: '', routes: [] }}
            sort={sort || "time"}
        />
    )
}