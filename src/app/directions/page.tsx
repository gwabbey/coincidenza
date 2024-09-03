import {Box, Flex, Title} from '@mantine/core';
import {LocationInput} from "@/components/LocationInput";
import {fetchData, reverseGeocode} from "@/api"; // Import reverseGeocode
import Directions from "@/components/Directions";
import AnimatedLayout from "@/components/AnimatedLayout";
import Link from "next/link";

export const dynamic = "force-dynamic";

const getDirections = async (from: string, to: string) => {
    if (!from || !to) {
        return null;
    }
    return await fetchData('direction', {
        params: {from, to}
    });
};

const getLocationName = async (coords: string) => {
    if (!coords) return "";
    const [lat, lon] = coords.split(",");
    const response = await reverseGeocode(lat, lon);
    return response.features?.[0]?.properties?.name || coords;
};

export default async function Page({searchParams}: { searchParams: { from: string, to: string } }) {
    const {from, to} = searchParams;

    const fromName = await getLocationName(from);
    const toName = await getLocationName(to);

    const directions = await getDirections(from, to);

    return (
        <Flex
            mih="100vh"
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
            <Box maw={500} w="100%">
                <AnimatedLayout isLoaded={!!directions}>
                    {/*<Title ta={"center"} order={1} w="100%">
                        Dove vuoi andare oggi?
                    </Title>*/}
                    <Title order={1} w="100%">
                        <LocationInput placeholder="Partenza" name="from" selected={fromName} />
                    </Title>
                    <Title order={1} w="100%">
                        <LocationInput placeholder="Arrivo" name="to" selected={toName} />
                    </Title>
                    <Link href={"/directions"} passHref>go back</Link>
                </AnimatedLayout>
            </Box>
            {directions && directions.routes.length > 0 && (
                <Box maw={500} w="100%">
                    <Directions directions={directions} />
                </Box>
            )}
        </Flex>
    );
}