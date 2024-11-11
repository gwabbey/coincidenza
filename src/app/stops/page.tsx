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
    let routes;

    if (lat && lon) {
        stops = await getClosestBusStops(lat.value, lon.value);
    } else {
        stops = await getClosestBusStops(46.07121658325195, 11.11913776397705);
    }

    if (id && type) {
        routes = await getStop(id.value, type.value);
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
                initialRoutes={routes || []}
                initialId={id?.value}
                initialType={type?.value}
            />
        </Flex>
    );
}