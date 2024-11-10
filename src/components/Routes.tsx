'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    Accordion,
    ActionIcon,
    Anchor,
    Badge,
    Box,
    Center,
    Group,
    Loader,
    Modal,
    Select,
    Stack,
    Title,
} from '@mantine/core';
import {getCookie, getStop, setCookie} from '@/api';
import {Stop} from '@/types';
import {RouteItem} from './RouteItem';
import {useDisclosure} from '@mantine/hooks';
import Image from 'next/image';
import {IconGps} from '@tabler/icons-react';
import {notifications} from "@mantine/notifications";

export default function Routes({
                                   stops,
                                   initialRoutes,
                                   initialId,
                                   initialType,
                               }: {
    stops: Stop[];
    initialRoutes: any[];
    initialId?: string;
    initialType?: string;
}) {
    const router = useRouter();
    const [value, setValue] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [routes, setRoutes] = useState<any[]>(initialRoutes);
    const [initialLoading, setInitialLoading] = useState(true);
    const [opened, {open, close}] = useDisclosure(false);
    const [userLocation, setUserLocation] = useState(false);

    const selectOptions = useMemo(() => {
        return stops.map((stop) => ({
            value: `${stop.stopId}-${stop.type}`,
            label: `${stop.stopName} (${stop.stopCode})`,
        }));
    }, [stops]);

    const stopMap = useMemo(() => {
        return stops.reduce((acc, stop) => {
            acc[`${stop.stopId}-${stop.type}`] = stop;
            return acc;
        }, {} as Record<string, Stop>);
    }, [stops]);

    useEffect(() => {
        const initializeState = async () => {
            const lat = await getCookie('lat');
            const lon = await getCookie('lon');
            if (!lat || !lon) {
                await handleFetchStops();
            }

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
                setRoutes(updatedRoutes);
            } catch (error) {
                console.error('Error refreshing routes:', error);
            }
        }
    }, [selectedStop]);

    useEffect(() => {
        const intervalId = setInterval(fetchRoutes, 15000);
        return () => clearInterval(intervalId);
    }, [fetchRoutes]);

    const handleStopChange = useCallback(async (selectedValue: string | null) => {
        if (!selectedValue) return;

        setValue(selectedValue);
        setInitialLoading(true);
        setRoutes([]);

        const stop = stopMap[selectedValue];
        if (stop) {
            setSelectedStop(stop);
            try {
                await Promise.all([
                    setCookie('id', stop.stopId),
                    setCookie('type', stop.type),
                ]);
                router.refresh();

                const newRoutes = await getStop(stop.stopId, stop.type);
                setRoutes(newRoutes);
            } catch (error) {
                console.error('Error updating stop:', error);
            } finally {
                setInitialLoading(false);
            }
        }
    }, [stopMap, router]);

    const handleFetchStops = useCallback(async () => {
        try {
            const userLocation = await getUserLocation();
            await setCookie('lat', userLocation.lat);
            await setCookie('lon', userLocation.lon);
            router.refresh();
        } catch (error) {
            console.error('Failed to get location', error);
        } finally {
        }
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
                        timeout: 10000,
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
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
            }}
        >
            <Box maw={750} w="100%" mx="auto" ta="left">
                <Select
                    data={selectOptions}
                    searchable
                    placeholder="Cerca una fermata per nome o codice"
                    limit={30}
                    size="xl"
                    my="sm"
                    allowDeselect={false}
                    onChange={handleStopChange}
                    rightSectionPointerEvents="all"
                    rightSection={
                        <ActionIcon
                            variant="transparent"
                            size="xl"
                            aria-label="La mia posizione"
                            onClick={handleFetchStops}
                        >
                            <IconGps stroke={1} size={36} />
                        </ActionIcon>
                    }
                    value={value}
                    radius="xl"
                    nothingFoundMessage="Nessuna fermata trovata"
                />
                <Group justify="center">
                    <Anchor inherit ta="center" onClick={open}>
                        Come trovo il codice di una fermata?
                    </Anchor>
                </Group>

                {selectedStop && (
                    <div style={{textAlign: 'center', marginTop: '16px'}}>
                        <Title order={1}>
                            {selectedStop.stopName}
                            {selectedStop.town && ` (${selectedStop.town})`}
                        </Title>
                        <Badge
                            size="xl"
                            color={selectedStop.type === 'E' ? 'blue' : 'green'}
                        >
                            {selectedStop.type === 'E' ? 'fermata extraurbana' : 'fermata urbana'}
                        </Badge>
                        {userLocation && (
                            <div>
                                a {selectedStop.distance > 1
                                ? `${selectedStop.distance.toFixed(2)} km`
                                : `${(selectedStop.distance * 1000).toFixed(0)} m`}{' '}
                                da te
                            </div>
                        )}
                    </div>
                )}

                {initialLoading ? (
                    <Center mt="xl">
                        <Loader
                            color={
                                selectedStop?.type === 'U'
                                    ? 'green'
                                    : selectedStop?.type === 'E'
                                        ? 'blue'
                                        : 'dimmed'
                            }
                        />
                    </Center>
                ) : routes.length > 0 && selectedStop ? (
                    <Accordion
                        chevronPosition="right"
                        transitionDuration={500}
                        maw={750}
                        w="100%"
                        mt="xl"
                    >
                        {routes.map((route) => (
                            <RouteItem
                                key={route.id}
                                route={route}
                                currentStop={selectedStop.stopId}
                            />
                        ))}
                    </Accordion>
                ) : (
                    <Center mt="xl" ta="center">
                        <div>Nessuna corsa trovata.</div>
                    </Center>
                )}
            </Box>
            <Modal
                opened={opened}
                onClose={close}
                title="Come trovo il codice di una fermata?"
                centered
                size="xl"
            >
                <Stack align="stretch" justify="flex-start" gap="md">
                    <div>
                        Ogni fermata di Trentino Trasporti ha un <strong>codice univoco</strong>, indicato sui fogli
                        informativi delle linee. Questo codice può essere utile per distinguere fermate con lo stesso
                        nome ma situate su <strong>lati opposti della strada</strong>.
                    </div>
                    <Group justify="center">
                        <Image
                            src="/urban-trento.png"
                            alt="Urbano Trento"
                            height={100}
                            width={200}
                            style={{
                                objectFit: 'cover',
                            }}
                        />
                        <Image
                            src="/urban-rovereto.png"
                            alt="Urbano Rovereto"
                            height={200}
                            width={200}
                            style={{
                                objectFit: 'cover',
                            }}
                        />
                        <Image
                            src="/extraurban.png"
                            alt="Extraurbano"
                            height={150}
                            width={300}
                            style={{
                                objectFit: 'cover',
                            }}
                        />
                    </Group>
                </Stack>
            </Modal>
        </div>
    );
}