'use client'

import { setCookie } from '@/api';
import { PopularStop, Stop } from '@/types';
import { Button, Flex, Stack, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';

const defaultStops: PopularStop[] = [
    { id: 1, name: 'Stazione di Trento', type: 'E' },
    { id: 1865, name: 'Rovereto Via Paoli', type: 'E' },
    { id: 1146, name: 'Autostazione Riva del Garda', type: 'E' },
    { id: 247, name: 'Piazza Dante', type: 'U' },
    { id: 1284, name: 'Corso Rosmini Posta', type: 'U' },
]

// TODO: make stop pills more specific (e.g. "direction x")
export function RecentStops({ recentStops, closestStops }: { recentStops: any, closestStops: any }) {
    const router = useRouter();
    const stops = recentStops ? JSON.parse(recentStops) : defaultStops;

    const stopMap = closestStops.reduce((acc: any, stop: any) => {
        acc[`${stop.stopId}-${stop.type}`] = stop;
        return acc;
    }, {} as Record<string, Stop>);

    const setStop = async (value: string) => {
        const stop = stopMap[value];
        const newStop = { id: stop.stopId, name: stop.stopName, type: stop.type };
        const updatedStops = [newStop, ...JSON.parse(recentStops || '[]').filter((s: any) => s.id !== newStop.id).slice(0, 4)];
        await setCookie('recentStops', JSON.stringify(updatedStops));
        router.push(`/bus?id=${stop.stopId}&type=${stop.type}`);
    }

    return (
        <Stack
            align="center"
            justify="flex-start"
            gap="md"
            mt="xl"
        >
            <Title order={3}>
                {recentStops ? 'Fermate recenti' : 'Fermate popolari'}
            </Title>
            <Flex
                gap="xl"
                justify="center"
                align="center"
                direction="row"
                wrap="wrap"
            >
                {stops.map((stop: any) => (
                    <Button
                        key={stop.id}
                        variant="outline"
                        radius="xl"
                        size="md"
                        color={stop.type === 'U' ? 'green' : 'blue'}
                        onClick={() => setStop(`${stop.id}-${stop.type}`)}
                    >
                        {stop.name}
                    </Button>
                ))}
            </Flex>
        </Stack>
    )
} 