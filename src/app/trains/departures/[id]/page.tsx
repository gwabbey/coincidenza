import {getStationMonitor} from "@/api";
import {Monitor} from "./Monitor";
import {Flex, Title} from "@mantine/core";
import stations from "../stations.json";

export default async function Page({
                                       params,
                                   }: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const monitor = await getStationMonitor(id);

    if (!monitor) {
        return "Dati non disponibili."
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
            <Monitor monitor={monitor} />
        </Flex>
    );
}