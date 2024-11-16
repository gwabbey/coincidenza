'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Accordion, Anchor, Box, Center, Group, Loader } from '@mantine/core';
import { getCookie, getStop, setCookie } from '@/api';
import { PopularStop, Stop } from '@/types';
import { RouteItem } from './RouteItem';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from "@mantine/notifications";
import { StopSearch } from './stops/stop-search';
import { StopInfo } from './stops/stop-info';
import { PopularStops } from './stops/popular-stops';
import { HelpModal } from './stops/help-modal';

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

    const stopMap = useMemo(() => {
        return stops.reduce((acc, stop) => {
            acc[`${stop.stopId}-${stop.type}`] = stop;
            return acc;
        }, {} as Record<string, Stop>);
    }, [stops]);

    useEffect(() => {
        const initializeState = async () => {
            if (initialId && initialType) {
                const key = `${initialId}-${initialType}`;
                const matchedStop = stopMap[key];
                if (matchedStop) {
                    setValue(key);
                    setSelectedStop(matchedStop);
                    setRoutes(initialRoutes);
                } else {
                    setValue(null);
                    setSelectedStop(null);
                    setRoutes([]);
                }
            }
            setInitialLoading(false);
        };
        initializeState();
    }, [stopMap, initialId, initialType, initialRoutes]);

    const fetchRoutes = useCallback(async () => {
        if (selectedStop) {
            try {
                const updatedRoutes = await getStop(selectedStop.stopId, selectedStop.type);
                if (updatedRoutes) {
                    setRoutes(updatedRoutes);
                }
            } catch (error) {
                console.error('Error refreshing routes:', error);
            }
        }
    }, [selectedStop]);

    useEffect(() => {
        const intervalId = setInterval(fetchRoutes, parseInt(process.env.AUTO_REFRESH || '10000'));
        return () => clearInterval(intervalId);
    }, [fetchRoutes]);

    const handleStopChange = useCallback(async (selectedValue: string | null) => {
        if (!selectedValue) return;

        const stop = stopMap[selectedValue];
        const recentStops = JSON.parse(await getCookie('recentStops') || '[]');
        const newStop = {
            id: stop.stopId,
            name: stop.stopName,
            type: stop.type
        };

        const updatedStops = [
            newStop,
            ...recentStops.filter((s: any) => s.id !== newStop.id).slice(0, 4)
        ];

        await setCookie('recentStops', JSON.stringify(updatedStops));
        router.push(`/stops?id=${stop.stopId}&type=${stop.type}`);
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
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                        });
                        setUserLocation(true);
                    },
                    (error) => {
                        let message;
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                message = 'Accesso negato alla posizione';
                                break;
                            case error.POSITION_UNAVAILABLE:
                                message = 'Posizione non disponibile';
                                break;
                            case error.TIMEOUT:
                                message = 'Timeout durante la richiesta';
                                break;
                            default:
                                message = 'Errore sconosciuto';
                                break;
                        }
                        notifications.show({
                            autoClose: 5000,
                            title: "Errore",
                            message: message,
                            color: 'red',
                            radius: 'lg',
                        });
                        setInitialLoading(false);
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                    }
                );
            } else {
                console.log('Errore geolocalizzazione');
                reject(new Error('Errore geolocalizzazione'));
            }
        });
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <Box maw={750} w="100%" mx="auto" ta="left">
                <StopSearch
                    stops={stops}
                    value={value}
                    onStopChange={handleStopChange}
                    onLocationRequest={handleFetchStops}
                />

                <Group justify="center">
                    <Anchor inherit ta="center" onClick={open}>
                        Come trovo il codice di una fermata?
                    </Anchor>
                </Group>

                {selectedStop && <StopInfo stop={selectedStop} userLocation={userLocation} />}

                {initialLoading ? (
                    <Center mt="xl">
                        <Loader color={selectedStop?.type === 'U' ? 'green' : selectedStop?.type === 'E' ? 'green' : 'dimmed'} />
                    </Center>
                ) : selectedStop && routes.length > 0 ? (
                    <Accordion chevronPosition="right" transitionDuration={500} maw={750} w="100%" mt="xl">
                        {routes.map((route) => (
                            <RouteItem key={route.id} route={route} currentStop={selectedStop.stopId} />
                        ))}
                    </Accordion>
                ) : selectedStop && routes.length === 0 ? (
                    <Center mt="xl" ta="center">
                        <div>Nessuna corsa trovata.</div>
                    </Center>
                ) : (
                    <PopularStops onStopSelect={(value) => handleStopChange(value)} recentStops={recentStops} />
                )}
            </Box>

            <HelpModal opened={opened} onClose={close} />
        </div>
    );
}
