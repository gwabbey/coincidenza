import { getStationMonitor } from "@/api";
import { Flex, Title } from "@mantine/core";
import stations from "../stations.json";
import { TrainStationInput } from "../TrainStationInput";
import { Monitor } from "./Monitor";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const monitor = await getStationMonitor(id);

    if (!monitor || !(stations as Record<string, string>)[id]) {
        return "Stazione non trovata."
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
                Partenze da {(stations as Record<string, string>)[id]}
            </Title>
            <TrainStationInput placeholder="Cerca stazione" selected={(stations as Record<string, string>)[id]} />
            <Monitor monitor={monitor} id={id} />
        </Flex>
    );
}