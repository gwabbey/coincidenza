import {Box, Flex, Title} from '@mantine/core';
import {LocationInput} from "@/components/LocationInput";
import {fetchData, reverseGeocode} from "@/api";
import Directions from "@/components/Directions";
import {cookies} from 'next/headers';

export const dynamic = "force-dynamic";

const getDirections = async (from: string, to: string) => {
    if (!from || !to) {
        return null;
    }

    const directions = await fetchData('direction', {
        params: {from, to}
    });

    directions.routes = await Promise.all(directions.routes.map(async (route: any) => {
        if (!route.transitDetails?.line?.agencies) {
            return route;
        }

        for (const agency of route.transitDetails?.line?.agencies) {
            if (agency.name !== "Trentino trasporti esercizio S.p.A.") {
                return route;
            }
        }

        const isUrban = route.legs[0].steps.some((step: any) =>
            step.transitDetails?.line?.shortName?.length < 4
        );

        const details = await fetchData('routes', {
            params: {
                type: isUrban ? 'U' : 'E',
            }
        });

        const routeId = details.routes.find((detailRoute: any) =>
            detailRoute.routeShortName === route.legs[0].steps[0].transitDetails.line.shortName
        )?.routeId;

        if (!routeId) {
            return route;
        }

        return {
            ...route,
            routeId,
        };
    }));

    return directions;
};

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
    const cookieStore = cookies();
    const from = cookieStore.get('from')?.value || '';
    const to = cookieStore.get('to')?.value || '';

    const fromName = await getLocationName(from);
    const toName = await getLocationName(to);

    const directions = await getDirections(from, to);

    return (
        <Flex
            mih="100vh"
            py="xl"
            style={{
                backgroundImage: "linear-gradient(to bottom right, rgb(0, 0, 255, 0.5), rgb(255, 0, 255, 0.5))",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
            gap="xl"
            align="center"
            direction="column"
            wrap="wrap"
        >
            <Box w="100%" style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}>
                <Title order={1} maw={750} w="100%">
                    <LocationInput
                        placeholder="Partenza"
                        name="from"
                        selected={fromName}
                    />
                </Title>
                <div style={{
                    borderLeft: "3px solid purple",
                    height: "50px",
                }} />
                <Title order={1} maw={750} w="100%">
                    <LocationInput
                        placeholder="Arrivo"
                        name="to"
                        selected={toName}
                    />
                </Title>
            </Box>
            {directions && directions.routes.length > 0 && (
                <Box maw={750} w="100%">
                    <Directions directions={directions} />
                </Box>
            )}
        </Flex>
    );
}