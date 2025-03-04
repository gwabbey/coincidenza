/* import { getStationMonitor } from "@/api";
import { Flex, Title } from "@mantine/core";
import { Suspense } from "react";
import stations from "../stations.json";
import { TrainStationInput } from "../TrainStationInput";
import { Monitor } from "./Monitor";
import { MonitorSkeleton } from "./MonitorSkeleton";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;

    return <Flex
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
        <Suspense fallback={<MonitorSkeleton />} key={id}>
            <PageMonitor id={id} />
        </Suspense>
    </Flex>
}

async function PageMonitor({ id }: { id: string }) {
    const monitor = await getStationMonitor(id);

    if (!monitor || !(stations as Record<string, string>)[id]) {
        return "Stazione non trovata."
    }

    return (
        <Monitor monitor={monitor} />
    );
} */