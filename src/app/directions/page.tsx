import { fetchData, getDirections, reverseGeocode } from "@/api";
import Directions from "@/components/Directions";
import stops from "@/stops.json";
import { Stop } from "@/types";
import { Box, Flex, Loader, Title } from '@mantine/core';
import { cookies } from 'next/headers';
import { Suspense } from "react";

const getLocationName = async (coords: string) => {
    if (!coords) return "";
    const [lat, lon] = coords.split(",");
    const response = await reverseGeocode(lat, lon);
    return [
        response.features?.[0]?.properties?.name,
        response.features?.[0]?.properties?.city,
        response.features?.[0]?.properties?.county,
        response.features?.[0]?.properties?.countrycode,
    ]
        .filter(Boolean)
        .join(", ") || coords;
};

export default async function Page() {
    const [fromCookie, toCookie] = await Promise.all([
        cookies().then((cookies) => cookies.get('from')?.value),
        cookies().then((cookies) => cookies.get('to')?.value),
    ]);

    const [from, to] = await Promise.all([
        getLocationName(fromCookie || ''),
        getLocationName(toCookie || ''),
    ]);

    const details = await fetchData('routes');

    const directions = await getDirections(fromCookie || '', toCookie || '', details);

    return (
        <Flex
            justify="center"
            direction="column"
            wrap="wrap"
            align="center"
            gap="md"
        >
            <Title order={1} maw={750} w="100%" mx="auto" ta="center">
                Cerca itinerario
            </Title>
            <Suspense fallback={<Loader size="xl" />}>
                {directions && (
                    <Box maw={750} w="100%">
                        <Directions directions={directions} from={from} to={to} stops={stops as Stop[]} />
                    </Box>
                )}
            </Suspense>
        </Flex>
    );
}