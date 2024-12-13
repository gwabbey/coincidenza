'use client'

import { PopularStop } from '@/types';
import { Button, Flex, Stack, Title } from '@mantine/core';
import Link from 'next/link';

const defaultStops: PopularStop[] = [
    { id: 1, name: 'Stazione di Trento', type: 'E' },
    { id: 1865, name: 'Rovereto Via Paoli', type: 'E' },
    { id: 1146, name: 'Autostazione Riva del Garda', type: 'E' },
    { id: 247, name: 'Piazza Dante', type: 'U' },
    { id: 1284, name: 'Corso Rosmini Posta', type: 'U' },
]

// TODO: add favorites
export function RecentStops({ recentStops, closestStops }: { recentStops: any, closestStops: any }) {
    return (
        <Stack
            align="center"
            justify="flex-start"
            gap="md"
            mt="xl"
        >
            <Title order={3}>
                Fermate popolari
            </Title>
            <Flex
                gap="xl"
                justify="center"
                align="center"
                direction="row"
                wrap="wrap"
            >
                {defaultStops.map((stop: any) => (
                    <Button
                        key={stop.id}
                        component={Link}
                        href={`/bus?id=${stop.id}&type=${stop.type}`}
                        w={{ base: "100%", sm: "auto" }}
                        variant="outline"
                        radius="xl"
                        size="md"
                        color={stop.type === 'U' ? 'green' : 'blue'}
                    >
                        {stop.name}
                    </Button>
                ))}
            </Flex>
        </Stack>
    )
} 