'use client';

import { getTrip } from "@/api";
import { Trip as TripProps } from '@/types';
import { getDelayColor } from "@/utils";
import {
    ActionIcon,
    Affix,
    Badge,
    Divider,
    Flex,
    Group,
    Indicator,
    Paper,
    Stack,
    Text,
    Timeline,
    Title,
    Transition,
    useMantineColorScheme,
    useMantineTheme
} from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import { IconAlertTriangleFilled, IconArrowUp, IconBus, IconMapPin } from "@tabler/icons-react";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Trip({ trip: initialTrip, routes }: { trip: TripProps, routes: any[] }) {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const [scroll, scrollTo] = useWindowScroll();
    const [trip, setTrip] = useState(initialTrip);

    const route = routes.find(route => route.routeId === trip.routeId);

    useEffect(() => {
        const interval = setInterval(async () => {
            const updatedTrip = await getTrip(trip.tripId, trip.type);
            if (updatedTrip) {
                setTrip(updatedTrip);
            }
        }, parseInt(process.env.AUTO_REFRESH || '10000'));

        return () => clearInterval(interval);
    }, [trip]);

    const activeIndex = trip.stopTimes.findIndex((stop: { stopId: number }) => stop.stopId === trip.stopLast);
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
            <Flex justify="center" align="center" direction={{ base: 'column', sm: 'row' }}>
                <Badge
                    size="xl"
                    radius="xl"
                    mr="xs"
                    color={trip.type === 'U' ? 'green' : 'blue'}
                >
                    {route.routeShortName}
                </Badge>
                <Title order={2}>
                    {trip.stopTimes[0].stopName} → {trip.stopTimes[trip.stopTimes.length - 1].stopName}
                </Title>
            </Flex>

            <Flex justify="center" align="center" my="md" direction={{ base: 'column', sm: 'row' }} visibleFrom="sm">
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

            <Flex
                justify="center"
                direction="column"
                wrap="wrap"
                gap={{ base: "sm", sm: "md" }}
                style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: colorScheme === "dark" ? theme.colors.dark[7] : "white",
                    zIndex: 1
                }}>
                <Divider my="xs" />

                <Flex justify={{ base: "space-between", sm: "center" }} align="center" direction={{ base: 'row', sm: 'column' }}>
                    <Stack gap={0}>
                        {trip.stopTimes[activeIndex] && Math.floor((new Date().getTime() - new Date(trip.lastEventRecivedAt).getTime()) / (1000 * 60)) > 5 && activeIndex !== trip.stopTimes.length - 1 ? (
                            <Text fz={{ base: "lg", sm: "xl" }} ta={{ base: "left", sm: "center" }} fs="italic"
                                w={{ base: 230, xs: 450, md: "100%" }} truncate>
                                {trip.stopTimes.reduce((closestStop: any, stopTime: any) => {
                                    const currentTime = new Date();
                                    const [hour, minute] = stopTime.departureTime.split(':').map(Number);
                                    const stopTimeDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), hour, minute + trip.delay);
                                    return stopTimeDate <= currentTime ? stopTime : closestStop;
                                }, null)?.stopName || "Rilevamento interrotto"}
                            </Text>
                        ) : (
                            <Text fz={{ base: "lg", sm: "xl" }} fw="bold" ta={{ base: "left", sm: "center" }}
                                w={{ base: 230, xs: 450, md: "100%" }} truncate>
                                {trip.stopTimes.length > 0 && !isDeparting ? trip.stopTimes[activeIndex]?.stopName : "--"}
                            </Text>
                        )}
                        {!trip.cableway && !isDeparting && !trip.stopTimes[activeIndex] && (
                            <Text fz={{ base: "lg", sm: "xl" }} fw="bold" ta={{ base: "left", sm: "center" }} truncate>
                                Dati in tempo reale non disponibili
                            </Text>
                        )}
                        {trip.cableway && (
                            <Group>
                                <Indicator color={`#${trip.cableway.descrColor}`} inline processing />
                                <Text fz={{ base: "lg", sm: "xl" }} fw="bold" ta={{ base: "left", sm: "center" }} truncate>
                                    {trip.cableway.descrizione}
                                </Text>
                            </Group>
                        )}
                        {trip.lastEventRecivedAt && (
                            <Flex direction="row" gap={4} justify={{ base: "flex-start", sm: "center" }}>
                                {trip.stopTimes[activeIndex] && Math.floor((new Date().getTime() - new Date(trip.lastEventRecivedAt).getTime()) / (1000 * 60)) > 5 && activeIndex !== trip.stopTimes.length - 1 && (
                                    <IconAlertTriangleFilled color="orange" size={16} style={{ alignSelf: "center" }} />
                                )}
                                <Text fz={{ base: "xs", sm: "sm" }} c="dimmed">
                                    Ultimo rilevamento: {new Date(trip.lastEventRecivedAt).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }).replace(/,/g, ' ')} ({trip.matricolaBus && `bus ${trip.matricolaBus}`})
                                </Text>
                            </Flex>
                        )}
                    </Stack>
                    {trip.delay !== null && (
                        <Badge
                            variant={colorScheme === "dark" ? "outline" : "filled"}
                            size={trip.delay == 0 ? "lg" : "xl"}
                            radius="sm"
                            mt={{ base: 0, sm: "md" }}
                            color={getDelayColor(trip.delay)}
                        >
                            {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : 'in orario'}
                            {trip.delay !== 0 && `${trip.delay} min`}
                        </Badge>
                    )}
                </Flex>

                <Divider my="xs" />
            </Flex>

            <Timeline
                active={
                    trip.stopTimes[activeIndex] && Math.floor((Date.now() - new Date(trip.lastEventRecivedAt).getTime()) / (1000 * 60)) > 5 && activeIndex !== trip.stopTimes.length - 1
                        ? trip.stopTimes.reduce((closestStop: any, stopTime: any) => {
                            const currentTime = new Date();
                            const [hour, minute] = stopTime.departureTime.split(':').map(Number);
                            const stopTimeDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), hour, minute + trip.delay);
                            return stopTimeDate <= currentTime ? stopTime : closestStop;
                        }, null)?.stopSequence - 1
                        : activeIndex
                }
                bulletSize={24}
                lineWidth={2}
                color={trip.type === 'U' ? 'green' : trip.type === 'E' ? 'blue' : 'dimmed'}
                mx={{ base: 0, sm: "auto" }}
            >
                {trip.stopTimes.map((stop: any, index: number) => {
                    const isCurrentStop = index === activeIndex;
                    const isPastStop = index <= activeIndex;
                    const isFutureStop = index > activeIndex;

                    const isAfterLastStop = index > activeIndex;

                    return (
                        <Timeline.Item
                            styles={{
                                itemTitle: {
                                    fontWeight: isCurrentStop ? 'bold' : 'normal',
                                },
                            }}
                            key={index}
                            title={
                                <Text component={Link} href={`/bus?id=${stop.stopId}&type=${stop.type}`} inherit>
                                    {stop.stopName}
                                </Text>
                            }
                            bullet={isCurrentStop ? <IconBus size={16} /> : <IconMapPin size={16} />}
                            color={isAfterLastStop ? 'yellow' : undefined}
                        >
                            {stop.departureTime ? (
                                <Group gap="xs">
                                    {isPastStop &&
                                        <Text c="dimmed" size="sm">
                                            {new Date(new Date(`2000-01-01 ${stop.departureTime}`).getTime()).toLocaleTimeString('it-IT', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    }
                                    {isFutureStop && trip.delay && trip.delay !== 0 &&
                                        <Text c="dimmed" size="sm" td="line-through">
                                            {new Date(new Date(`2000-01-01T${stop.departureTime.replace(/^24:/, '00:')}`).getTime()).toLocaleTimeString('it-IT', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    }
                                    {isFutureStop &&
                                        <Text size="sm" fw="bold" c={getDelayColor(trip.delay)}>
                                            {new Date(new Date(`2000-01-01T${stop.departureTime.replace(/^24:/, '00:')}`).getTime() + (trip.delay * 60 * 1000)).toLocaleTimeString('it-IT', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    }
                                </Group>
                            ) : (
                                <Text size="sm">--</Text>
                            )}
                        </Timeline.Item>
                    );
                })}
            </Timeline>
            <Affix position={{ bottom: 20, right: 20 }}>
                <Transition transition="slide-up" mounted={scroll.y > 0}>
                    {(transitionStyles) => (
                        <ActionIcon variant="filled" size="xl" radius="xl" style={transitionStyles}
                            color={trip.type === 'U' ? 'green' : 'blue'}
                            onClick={() => scrollTo({ y: 0 })}>
                            <IconArrowUp style={{ width: '70%', height: '70%' }} stroke={1.5} />
                        </ActionIcon>
                    )}
                </Transition>
            </Affix>
        </Flex>
    );
}