import { getClosestBusStops, getRoutes, getStopTrips } from "@/api";
import { Routes } from "@/components/Routes";
import { RecentStops } from "@/components/stops/recent-stops";
import { StopSearch } from "@/components/stops/stop-search";
import { Stop } from "@/types";
import { Box, Title } from "@mantine/core";
import { cookies } from "next/headers";

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
    let stop;

    if (lat && lon) {
        closestStops = await getClosestBusStops(lat, lon);
    } else {
        closestStops = await getClosestBusStops(46.07121658325195, 11.11913776397705);
    }

    if (id && type && routes) {
        stop = await getStopTrips(id, type, routes);
    }

    return (
        <Box maw={750} w="100%" mx="auto">
            <Title order={1} maw={750} w="100%" mx="auto" ta="center">
                Cerca fermata
            </Title>

            <StopSearch
                stops={closestStops}
            />

            {id && type ? (
                <Routes
                    stops={closestStops}
                    stop={stop || { stopId: 0, type: '', routes: [] }}
                    sort={sort || "time"}
                />
            ) : (
                <RecentStops recentStops={recentStops} closestStops={closestStops} />
            )}
        </Box>
    );
}