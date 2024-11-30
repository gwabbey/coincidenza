import { fetchData, getDirections, reverseGeocode } from "@/api";
import Directions from "@/components/Directions";
import { Box, Flex, Loader, Title } from '@mantine/core';
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

export default async function Page({ searchParams }: { searchParams: Promise<{ from: string; to: string; time: string }> }) {
    const { from, to, time } = await searchParams;

    const [fromName, toName] = await Promise.all([
        getLocationName(from),
        getLocationName(to),
    ]);

    const details = await fetchData('routes');

    const directions = await getDirections(from, to, time, details);

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
                <Box maw={750} w="100%">
                    <Directions directions={directions} from={fromName} to={toName} />
                </Box>
            </Suspense>
        </Flex>
    );
}