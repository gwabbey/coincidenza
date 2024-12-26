import { fetchData, getDirections } from "@/api";
import Directions from "@/components/Directions";
import { Box, Flex, Title } from '@mantine/core';
import { cookies } from "next/headers";

async function getLocationName(name: string) {
    const location = (await cookies()).get(name);
    return location?.value ?? "";
};

export default async function Page({ searchParams }: { searchParams: Promise<{ from: string; to: string; time: string }> }) {
    const { from, to, time } = await searchParams;

    const [fromName, toName] = await Promise.all([
        from ? getLocationName("from") : "",
        to ? getLocationName("to") : "",
    ]);

    const details = await fetchData('routes');

    const directions = await getDirections(from, to, time || new Date().toISOString(), details);

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
            <Box maw={750} w="100%">
                <Directions directions={directions} from={fromName} to={toName} />
            </Box>
        </Flex>
    );
}