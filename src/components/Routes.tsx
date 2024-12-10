'use client';

import { getCookie, getStop, setCookie } from '@/api';
import { PopularStop, Stop } from '@/types';
import { getDelayColor } from '@/utils';
import { Accordion, Anchor, Badge, Box, Center, Flex, Group, Loader, SegmentedControl, Select, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from "@mantine/notifications";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteItem } from './RouteItem';
import { HelpModal } from './stops/help-modal';
import { PopularStops } from './stops/popular-stops';
import { StopInfo } from './stops/stop-info';
import { StopSearch } from './stops/stop-search';

export const revalidate = 0;

interface RoutesProps {
    stops: Stop[];
    recentStops: PopularStop[];
    initialRoutes: any[];
    initialId?: string;
    initialType?: string;
}

export function Routes({
    stops,
    recentStops,
    initialRoutes,
    initialId,
    initialType,
}: RoutesProps) {
    const router = useRouter();
    const [value, setValue] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [routes, setRoutes] = useState<any[]>(initialRoutes);
    const [initialLoading, setInitialLoading] = useState(true);
    const [opened, { open, close }] = useDisclosure(false);
    const [userLocation, setUserLocation] = useState(false);

    const stopMap = useMemo(
        () => stops.reduce((acc, stop) => {
            acc[`${stop.stopId}-${stop.type}`] = stop;
            return acc;
        }, {} as Record<string, Stop>),
        [stops]
    );

    useEffect(() => {
        const initializeState = async () => {
            if (initialId && initialType) {
                const key = `${initialId}-${initialType}`;
                const matchedStop = stopMap[key];
                setValue(key);
                setSelectedStop(matchedStop || null);
                setRoutes(matchedStop ? initialRoutes : []);
            }
            setInitialLoading(false);
        };
        initializeState();
    }, [stopMap, initialId, initialType, initialRoutes]);

    const fetchRoutes = useCallback(async () => {
        if (selectedStop) {
            try {
                const updatedRoutes = await getStop(selectedStop.stopId, selectedStop.type);
                setRoutes(updatedRoutes || []);
            } catch (error) {
                console.error('Error refreshing routes:', error);
            }
        }
    }, [selectedStop]);

    useEffect(() => {
        const intervalId = setInterval(fetchRoutes, parseInt(process.env.AUTO_REFRESH || '10000', 10));
        return () => clearInterval(intervalId);
    }, [fetchRoutes]);

    const handleStopChange = useCallback(async (selectedValue: string | null) => {
        if (!selectedValue) return;
        const stop = stopMap[selectedValue];
        const recentStops = JSON.parse(await getCookie('recentStops') || '[]');
        const newStop = { id: stop.stopId, name: stop.stopName, type: stop.type };
        const updatedStops = [newStop, ...recentStops.filter((s: any) => s.id !== newStop.id).slice(0, 4)];

        await setCookie('recentStops', JSON.stringify(updatedStops));
        router.push(`/bus?id=${stop.stopId}&type=${stop.type}`);
    }, [stopMap, router]);

    const handleFetchStops = useCallback(async () => {
        const userLocation = await getUserLocation();
        await setCookie('lat', userLocation.lat);
        await setCookie('lon', userLocation.lon);
        router.refresh();
    }, [router]);

    function getUserLocation(): Promise<{ lat: number; lon: number }> {
        return new Promise((resolve, reject) => {
            if (typeof window !== 'undefined' && 'geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
                        setUserLocation(true);
                    },
                    (error) => {
                        let message = 'Errore sconosciuto';
                        if (error.code === error.PERMISSION_DENIED) message = 'Accesso negato alla posizione';
                        else if (error.code === error.POSITION_UNAVAILABLE) message = 'Posizione non disponibile';
                        else if (error.code === error.TIMEOUT) message = 'Timeout durante la richiesta';

                        notifications.show({
                            autoClose: 5000,
                            title: "Errore",
                            message,
                            color: 'red',
                            radius: 'lg',
                        });
                        setInitialLoading(false);
                    },
                    { enableHighAccuracy: true, maximumAge: 0 }
                );
            } else reject(new Error('Geolocation not supported'));
        });
    }

    const [sort, setSort] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('sort') || 'time' : 'time'));
    const [view, setView] = useState(() => {
        const isPassingStop = routes.every((route: any) =>
            route.stops.every((trip: any) => {
                const isFirstStopCurrentStop = trip.stopTimes[0].stopId.toString() === selectedStop?.stopId.toString();
                const isLastStopCurrentStop = trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === selectedStop?.stopId.toString();
                return !isFirstStopCurrentStop && !isLastStopCurrentStop;
            })
        );

        return isPassingStop ? 'departures' :
            (typeof window !== 'undefined' ? localStorage.getItem('view') || 'departures' : 'departures');
    });

    useEffect(() => {
        const isPassingStop = routes.every((route: any) =>
            route.stops.every((trip: any) => {
                const isFirstStopCurrentStop = trip.stopTimes[0].stopId.toString() === selectedStop?.stopId.toString();
                const isLastStopCurrentStop = trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === selectedStop?.stopId.toString();
                return !isFirstStopCurrentStop && !isLastStopCurrentStop;
            })
        );

        if (isPassingStop) {
            setView('departures');
        } else if (typeof window !== 'undefined') {
            setView(localStorage.getItem('view') || 'departures');
        }
    }, [selectedStop, routes]);

    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('sort', sort);
        if (typeof window !== 'undefined') localStorage.setItem('view', view);
    }, [sort, view]);

    const calculateMinutesToArrival = (trip: any) => {
        const now = new Date();

        const theoreticalTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata);

        const isTracked = trip.matricolaBus && trip.lastEventRecievedAt;

        const arrivalTime = isTracked
            ? new Date(theoreticalTime.getTime() + trip.delay * 60 * 1000)
            : theoreticalTime;

        if (arrivalTime.getTime() < now.getTime()) return "0'";

        const totalMinutes = Math.ceil((arrivalTime.getTime() - now.getTime()) / (60 * 1000));

        if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}h ${minutes}m`;
        }

        return `${totalMinutes}'`;
    };

    return (
        <Box maw={750} w="100%" mx="auto" ta="left">
            <StopSearch
                stops={stops}
                value={value}
                onStopChange={handleStopChange}
                onLocationRequest={handleFetchStops}
            />

            <Stack gap="sm">
                <Group justify="center">
                    <Anchor inherit ta="center" onClick={open}>
                        Come trovo il codice di una fermata?
                    </Anchor>
                </Group>
            </Stack>

            {selectedStop && <StopInfo stop={selectedStop} userLocation={userLocation} />}

            {selectedStop && (
                <Group justify="center" mt="md">
                    Ordina per:
                    <Select
                        data={[
                            { value: 'time', label: 'Orario' },
                            { value: 'line', label: 'Linea' },
                        ]}
                        value={sort}
                        onChange={(value) => setSort(value || 'time')}
                    />
                </Group>
            )}

            {initialLoading ? (
                <Center mt="xl">
                    <Loader color={selectedStop?.type === 'U' ? 'green' : selectedStop?.type === 'E' ? 'green' : 'dimmed'} />
                </Center>
            ) : selectedStop && routes.length > 0 ? (
                sort === 'line' ? (
                    <Accordion chevronPosition="right" transitionDuration={500} maw={750} w="100%" mt="xl">
                        {routes.map((route) => (
                            <RouteItem key={route.id} route={route} currentStop={selectedStop.stopId} />
                        ))}
                    </Accordion>
                ) : (
                    <Stack maw={750} w="100%" mt="xl">
                        {selectedStop && sort === 'time' && (
                            !routes.every(route =>
                                route.stops.every((trip: any) => {
                                    const isFirstStopCurrentStop = trip.stopTimes[0].stopId.toString() === selectedStop?.stopId.toString();
                                    const isLastStopCurrentStop = trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === selectedStop?.stopId.toString();
                                    return !isFirstStopCurrentStop && !isLastStopCurrentStop;
                                })
                            ) && (
                                <SegmentedControl
                                    value={view}
                                    onChange={setView}
                                    data={[
                                        { label: 'Partenze', value: 'departures' },
                                        { label: 'Arrivi', value: 'arrivals' },
                                    ]}
                                    transitionDuration={500}
                                    transitionTimingFunction="linear"
                                />
                            )
                        )}

                        {routes
                            .flatMap((route) => route.stops)
                            .filter(trip => {
                                const isFirstStopCurrentStop = trip.stopTimes[0].stopId.toString() === selectedStop?.stopId.toString();
                                const isLastStopCurrentStop = trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === selectedStop?.stopId.toString();
                                const isPassingThrough = trip.stopTimes.some((stopTime: any, index: number) =>
                                    stopTime.stopId.toString() === selectedStop?.stopId.toString() && index < trip.stopTimes.length - 1
                                );

                                return view === 'departures'
                                    ? isFirstStopCurrentStop || isPassingThrough
                                    : isLastStopCurrentStop;
                            }).sort((a: any, b: any) => {
                                const aDate = new Date(a.oraArrivoEffettivaAFermataSelezionata);
                                const bDate = new Date(b.oraArrivoEffettivaAFermataSelezionata);
                                return aDate.getTime() - bDate.getTime();
                            })
                            .map((trip: any, index: number) => (
                                <Flex key={index} w="100%">
                                    <Group key={index} gap="xs" w="100%">
                                        <Badge
                                            size="xl"
                                            radius="xl"
                                            color={
                                                routes.find(route => route.id === trip.routeId)?.details.routeColor
                                                    ? `#${routes.find(route => route.id === trip.routeId)?.details.routeColor}`
                                                    :
                                                    routes.find(route => route.id === trip.routeId)?.details.type === 'U' ? 'gray' : "blue"
                                            }
                                            px={0}
                                            py="md"
                                            autoContrast
                                            w={50}
                                            ta="center"
                                        >
                                            {routes.find(route => route.id === trip.routeId)?.details.routeShortName}
                                        </Badge>
                                        <Stack gap={0}>
                                            <Text size="lg" fw="bold" inline truncate component={Link} href={`/trips/${trip.tripId}:${trip.type}`} w={{ base: 200, sm: 300, md: 400, lg: "auto" }}>
                                                {view === 'departures' ? trip.tripHeadsign : stopMap[`${trip.stopTimes[0].stopId}-${trip.type}`]?.stopName}
                                            </Text>
                                            <Group gap={0}>
                                                {trip.stopTimes[0].arrivalTime > new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8) ? (
                                                    <Text size="sm"
                                                        c={trip.isDeparting ? 'green' : 'dimmed'}>{trip.isDeparting ? 'in partenza' : 'non ancora partito'}</Text>) : [trip.delay, trip.lastEventRecivedAt, trip.matricolaBus].every(item => item === null) && (
                                                            <Text size="sm" c="dimmed">dati in tempo reale non disponibili</Text>)}
                                                {trip.delay !== null && trip.stopTimes[0].arrivalTime < new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8) && (
                                                    <Text size="sm" c={getDelayColor(trip.delay)}>
                                                        {trip.delay < 0 ? `${Math.abs(trip.delay)} min in anticipo` : trip.delay > 0 ? `${trip.delay} min in ritardo` : 'in orario'}
                                                    </Text>)}
                                            </Group>
                                        </Stack>
                                    </Group>
                                    <Flex justify="end" align="center" w={{ base: 100, lg: "100%" }}>
                                        <Text size="lg" fw="bold" ta="right">
                                            {calculateMinutesToArrival(trip)}
                                        </Text>
                                    </Flex>
                                </Flex>
                            ))}
                    </Stack>
                )
            ) : selectedStop && routes.length === 0 ? (
                <Center mt="xl">
                    <div>Le corse di oggi sono terminate.</div>
                </Center>
            ) : (
                <PopularStops onStopSelect={(value) => handleStopChange(value)} recentStops={recentStops} />
            )}
            <HelpModal opened={opened} onClose={close} />
        </Box>
    );
}