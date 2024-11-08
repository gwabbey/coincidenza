'use client';

import {useEffect, useState} from 'react';
import {Badge, Divider, Flex, Group, Paper, Stack, Text, Timeline, Title} from "@mantine/core";
import {getDelayColor} from "@/utils";
import {getTrip} from "@/api";
import {IconBus, IconMapPin} from "@tabler/icons-react";

export default function Trip({trip: initialTrip, tripId}: { trip: any, tripId: string }) {
    const [trip, setTrip] = useState(initialTrip);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const updatedTrip = await getTrip(tripId);
                setTrip(updatedTrip);
            } catch (error) {
                console.error('Failed to fetch trip update:', error);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [tripId]);

    const activeIndex = trip.stopTimes.findIndex((stop: { stopId: string; }) => stop.stopId === trip.stopLast);
    const isDeparting = trip.delay === 0 && trip.lastEventRecivedAt && activeIndex === -1;

    const calculateDuration = (arrival: string, departure: string) =>
        Math.abs(
            (new Date(0, 0, 0, ...arrival.split(':').map(Number)).getTime() -
                new Date(0, 0, 0, ...departure.split(':').map(Number)).getTime()) / 60000
        );

    const tripDuration = calculateDuration(
        trip.stopTimes[trip.stopTimes.length - 1].arrivalTime,
        trip.stopTimes[0].arrivalTime
    );

    const formatDuration = (duration: number) => {
        if (duration >= 60) {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes}m`;
        }
        return `${duration}m`;
    };

    return (
        <Flex
            justify="center"
            direction="column"
            wrap="wrap"
            ta="center"
            gap="md"
        >
            <Flex justify="center" align="center" direction={{base: 'column', sm: 'row'}}>
                <Badge
                    size="xl"
                    radius="xl"
                    mr="xs"
                    color={trip.type === 'U' ? 'green' : 'blue'}
                >
                    {trip.route.routeShortName}
                </Badge>
                <Title order={2}>
                    {trip.stopTimes[0].stopName} → {trip.stopTimes[trip.stopTimes.length - 1].stopName}
                </Title>
            </Flex>

            <Flex justify="center" align="center" my="md" direction={{base: 'column', sm: 'row'}} visibleFrom="sm">
                <Paper shadow="xl" radius="xl" p="md" withBorder>
                    <Text fw="bold">{trip.stopTimes[0].stopName}</Text>
                    <Text>{trip.stopTimes[0].arrivalTime.replace(/^24:/, '00:').slice(0, 5)}</Text>
                </Paper>

                <Divider my="xs" label={formatDuration(tripDuration)} labelPosition="center" w={200} />

                <Paper shadow="xl" radius="xl" p="md" withBorder>
                    <Text fw="bold">{trip.stopTimes[trip.stopTimes.length - 1].stopName}</Text>
                    <Text>{trip.stopTimes[trip.stopTimes.length - 1].arrivalTime.replace(/^24:/, '00:').slice(0, 5)}</Text>
                </Paper>
            </Flex>

            <Divider my="xs" />

            <Flex justify={{base: "space-between", sm: "center"}} align="center"
                  direction={{base: 'row', sm: 'column'}}>
                <Stack gap={0}>
                    <Text fz={{base: "lg", sm: "xl"}} fw="bold" ta={{base: "left", sm: "center"}}
                          w={{base: 230, xs: 450, md: "100%"}} truncate>
                        {trip.stopTimes.length > 0 ? trip.stopTimes[activeIndex]?.stopName : "--"}
                    </Text>
                    {!isDeparting && !trip.stopTimes[activeIndex] && (
                        <Text fz={{base: "lg", sm: "xl"}} fw="bold" ta={{base: "left", sm: "center"}} truncate>
                            Dati in tempo reale non disponibili
                        </Text>
                    )}
                    {trip.lastEventRecivedAt && (
                        <Text fz={{base: "xs", sm: "sm"}} c="dimmed" ta={{base: "left", sm: "center"}}>
                            Ultimo aggiornamento: {new Date(trip.lastEventRecivedAt).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                        }).replace(/,/g, ' ')}
                        </Text>
                    )}
                </Stack>
                {trip.delay !== null && (
                    <Badge
                        variant="outline"
                        size={trip.delay == 0 ? "lg" : "xl"}
                        radius="sm"
                        mt={{base: 0, sm: "md"}}
                        color={getDelayColor(trip.delay)}
                    >
                        {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : 'in orario'}
                        {trip.delay !== 0 && `${trip.delay} min`}
                    </Badge>
                )}
            </Flex>

            <Divider my="xs" />

            <Timeline active={activeIndex} bulletSize={24} lineWidth={2} color={trip.type === 'U' ? 'green' : 'blue'}
                      mx={{base: 0, sm: "auto"}}>
                {trip.stopTimes.map((stop: any, index: number) => (
                    <Timeline.Item
                        styles={{
                            itemTitle: {
                                fontWeight: index === activeIndex ? 'bold' : 'normal',
                            },
                        }}
                        key={index}
                        title={stop.stopName || `Stop ${stop.stopId}`}
                        bullet={index === activeIndex ? <IconBus size={16} /> : <IconMapPin size={16} />}
                    >
                        <Group gap="xs">
                            {index <= activeIndex &&
                                <Text c="dimmed" size="sm">
                                    {new Date(new Date(`2000-01-01 ${stop.departureTime}`).getTime()).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            }
                            {index > activeIndex && trip.delay && trip.delay !== 0 &&
                                <Text c="dimmed" size="sm" td="line-through">
                                    {new Date(new Date(`2000-01-01T${stop.departureTime.replace(/^24:/, '00:')}`).getTime()).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            }
                            {index > activeIndex &&
                                <Text size="sm" fw="bold" c={getDelayColor(trip.delay)}>
                                    {new Date(new Date(`2000-01-01T${stop.arrivalTime.replace(/^24:/, '00:')}`).getTime() + (trip.delay * 60 * 1000)).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            }
                        </Group>
                    </Timeline.Item>
                ))}
            </Timeline>
        </Flex>
    );
}