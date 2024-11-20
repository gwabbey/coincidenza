import { getDirections, reverseGeocode } from "@/api";
import Directions from "@/components/Directions";
import { Box, Flex } from '@mantine/core';
import { cookies } from 'next/headers';

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

    const from = await getLocationName(fromCookie || '');
    const to = await getLocationName(toCookie || '');

    const directions = await getDirections(fromCookie || '', toCookie || '');

    return (<Flex
        mih="100vh"
        py="xl"
        gap="xl"
        align="center"
        direction="column"
        wrap="wrap"
    >
        {directions && directions.routes.length > 0 && (
            <Box maw={750} w="100%">
                <Directions directions={directions} from={from} to={to} />
            </Box>
        )}
    </Flex>
    );
}