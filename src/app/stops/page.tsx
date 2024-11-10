import {cookies} from "next/headers";
import {getClosestBusStops, getStop} from "@/api";
import Routes from "@/components/Routes";
import {Flex, Title} from "@mantine/core";

export default async function Page() {
    const id = (await cookies()).get('id');
    const type = (await cookies()).get('type');
    const lat = (await cookies()).get('lat');
    const lon = (await cookies()).get('lon');
    let stops;

    if (lat && lon) {
        stops = await getClosestBusStops(lat.value, lon.value);
    }

    const initialRoutes = id && type ? await getStop(id.value, type.value) : [];

    if (!stops) {
        return "Connessione persa."
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
                stops={stops}
                initialRoutes={initialRoutes}
                initialId={id?.value}
                initialType={type?.value}
            />
        </Flex>
    );
}