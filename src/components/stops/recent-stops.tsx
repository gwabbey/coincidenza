'use client'

import { PopularStop } from '@/types';
import { Button, Flex, Stack, Title } from '@mantine/core';
import { motion } from 'motion/react';
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
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

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
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
            >
                <Flex
                    gap="xl"
                    justify="center"
                    align="center"
                    direction="row"
                    wrap="wrap"
                >
                    {defaultStops.map((stop: any) => (
                        <motion.div key={stop.id} variants={item}>
                            <Button
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
                        </motion.div>
                    ))}
                </Flex>
            </motion.div>
        </Stack>
    )
} 