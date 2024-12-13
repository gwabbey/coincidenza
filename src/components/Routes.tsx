'use client';

import { setCookie } from '@/api';
import { Stop } from '@/types';
import { getDelayColor } from '@/utils';
import { Accordion, Alert, Anchor, Badge, Box, Button, Center, Container, Flex, Grid, Group, SegmentedControl, Select, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { HelpModal } from './stops/help-modal';
import { NewsModal } from './stops/news-modal';

export const revalidate = 0;

interface RoutesProps {
    stops: Stop[];
    stop: { stopId: number, type: string, routes: any[] };
    sort: string;
}

export function Routes({
    stops,
    stop,
    sort,
}: RoutesProps) {
    const router = useRouter();
    const [helpOpened, helpHandlers] = useDisclosure(false);
    const [newsOpened, newsHandlers] = useDisclosure(false);

    const stopMap = useMemo(
        () => stops.reduce((acc, stop) => {
            acc[`${stop.stopId}-${stop.type}`] = stop;
            return acc;
        }, {} as Record<string, Stop>),
        [stops]
    );

    const details = stopMap[`${stop.stopId}-${stop.type}`];
    const news = Array.from(
        new Map(
            stop.routes
                .flatMap((route) => route.details.news || [])
                .map((newsItem) => [`${newsItem.details}-${newsItem.header}`, newsItem])
        ).values()
    );

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, parseInt(process.env.AUTO_REFRESH || '10000', 10));
        return () => clearInterval(intervalId);
    }, [router]);

    const [view, setView] = useState("departures");

    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('sort', sort);
    }, [sort]);

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
            <Stack gap="sm">
                <Group justify="center">
                    <Anchor inherit ta="center" onClick={helpHandlers.open}>
                        Come trovo il codice di una fermata?
                    </Anchor>
                </Group>
            </Stack>

            {details && (
                <Container mt="sm" ta="center">
                    <Title order={2}>
                        {details.stopName}
                        {details.town && !details.stopName.includes(details.town) && ` (${details.town})`}
                    </Title>
                    <Badge
                        size="xl"
                        color={details.type === 'E' ? 'blue' : 'green'}
                    >
                        {details.type === 'E' ? 'fermata extraurbana' : 'fermata urbana'}
                    </Badge>
                    <div>
                        a {details.distance && details.distance > 1
                            ? `${details.distance.toFixed(2)} km`
                            : `${((details.distance ? details.distance : 0) * 1000).toFixed(0)} m`}{' '}
                        da te
                    </div>
                </Container>
            )}

            {stop && (
                // TODO: check if it can be done faster
                <Group justify="center" mt="md">
                    Ordina per:
                    <Select
                        data={[
                            { value: 'time', label: 'Orario' },
                            { value: 'line', label: 'Linea' },
                        ]}
                        value={sort}
                        onChange={(value) => setCookie('sort', value || 'time')}
                    />
                </Group>
            )}

            <Group justify="center" mt="md">
                <Button leftSection={<IconAlertTriangle size={24} />} variant="light" color="yellow" onClick={newsHandlers.open} w={{ base: "100%", sm: "auto" }}>
                    Avvisi
                </Button>
            </Group>

            {stop && stop.routes.length > 0 ? (
                sort === 'line' ? (
                    <Accordion chevronPosition="right" transitionDuration={500} maw={750} w="100%" mt="md" key={stop.stopId}>
                        {stop.routes.map((route, index) => (
                            <Accordion.Item key={index} value={index.toString()}>
                                <Accordion.Control px="xs">
                                    <Group gap="xs" wrap="nowrap" w="100%">
                                        <Badge
                                            size="xl"
                                            radius="xl"
                                            color={
                                                route.details.routeColor
                                                    ? `#${route.details.routeColor}`
                                                    :
                                                    route.details.type === 'U' ? 'gray' : "blue"
                                            }
                                            px={0}
                                            py="md"
                                            autoContrast
                                            miw={50}
                                            ta="center"
                                        >
                                            {route.details.routeShortName}
                                        </Badge>
                                        <Text fw="bold" inline truncate fz={{ base: 'md', sm: 'lg' }}>
                                            {route.details.routeLongName}
                                        </Text>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    {route.details.news?.map((news: any, index: number) => (
                                        <Alert
                                            key={index}
                                            my="xs"
                                            autoContrast
                                            variant="light"
                                            color="yellow"
                                            radius="xl"
                                            title={news.header}
                                            icon={<IconAlertCircle />}
                                        >
                                            {news.details}{" "}
                                            {news.url && (<Link href={news.url} target="_blank">
                                                Dettagli
                                            </Link>)}
                                        </Alert>
                                    ))}

                                    <div>
                                        {route.trips.map((trip: any, index: any) => {
                                            const arrivalTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata).getTime();
                                            const currentTime = new Date().getTime();
                                            const diffInMinutes = Math.floor((arrivalTime - currentTime) / (1000 * 60));

                                            return (<Container fluid key={index} fz={{ base: 'lg', md: 'xl' }} px={0}>
                                                <Grid justify="space-between" align="center">
                                                    <Grid.Col span="content">
                                                        <Flex direction="column" wrap={{ base: "wrap", sm: "nowrap" }}
                                                            w={{ base: 250, xs: 450, sm: 650 }}>
                                                            <Text
                                                                inherit
                                                                component={Link}
                                                                href={`/trips/${trip.tripId}:${trip.type}`}
                                                                fw="bold"
                                                                fz={{ base: 'md', sm: 'lg' }}>
                                                                → {trip.tripHeadsign}
                                                            </Text>
                                                        </Flex>

                                                        <Group gap={0}>
                                                            {trip.stopTimes[0].arrivalTime > new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8) && (
                                                                <Text size="sm" fz={{ base: 'sm', sm: 'md' }}
                                                                    c={trip.isDeparting ? 'green' : 'dimmed'}>{trip.isDeparting ? 'in partenza' : 'non ancora partito'}</Text>)}
                                                            {trip.delay !== null && trip.stopTimes[0].arrivalTime < new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8) && (
                                                                <Text size="sm" fz={{ base: 'sm', sm: 'md' }} c={getDelayColor(trip.delay)}>
                                                                    {trip.delay < 0 ? `${Math.abs(trip.delay)} min in anticipo` : trip.delay > 0 ? `${trip.delay} min in ritardo` : 'in orario'}
                                                                </Text>)}
                                                        </Group>

                                                        <Text fz={{ base: 'sm', sm: 'md' }}>
                                                            {(trip.stopTimes[0].stopId.toString() === stop.stopId?.toString() && trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() !== stop.stopId.toString()) ? 'in partenza' : trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === stop.stopId?.toString() ? 'in arrivo' : 'passa'}{' '}
                                                            <strong>{diffInMinutes <= 0 ? 'adesso' : `tra ${diffInMinutes >= 60 ? `${Math.floor(diffInMinutes / 60)} or${Math.floor(diffInMinutes / 60) === 1 ? 'a' : 'e'}` : `${diffInMinutes} minut${diffInMinutes === 1 ? 'o' : 'i'}`}`}</strong>
                                                        </Text>

                                                    </Grid.Col>
                                                </Grid>
                                            </Container>);
                                        })}
                                    </div>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                ) : (
                    <Stack maw={750} w="100%" mt="md">
                        {stop && sort === 'time' && (
                            !stop.routes.every(route =>
                                route.trips.every((trip: any) => {
                                    const isFirstStopCurrentStop = trip.stopTimes[0].stopId.toString() === stop?.stopId.toString();
                                    const isLastStopCurrentStop = trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === stop?.stopId.toString();
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

                        {stop.routes
                            .flatMap((route) => route.trips)
                            .filter(trip => {
                                const isFirstStopCurrentStop = trip.stopTimes[0].stopId.toString() === stop?.stopId.toString();
                                const isLastStopCurrentStop = trip.stopTimes[trip.stopTimes.length - 1].stopId.toString() === stop?.stopId.toString();
                                const isPassingThrough = trip.stopTimes.some((stopTime: any, index: number) =>
                                    stopTime.stopId.toString() === stop?.stopId.toString() && index < trip.stopTimes.length - 1
                                );

                                return view === 'departures' ? isFirstStopCurrentStop || isPassingThrough : isLastStopCurrentStop;
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
                                                stop.routes.find(route => route.id === trip.routeId)?.details.routeColor
                                                    ? `#${stop.routes.find(route => route.id === trip.routeId)?.details.routeColor}`
                                                    :
                                                    stop.routes.find(route => route.id === trip.routeId)?.details.type === 'U' ? 'gray' : "blue"
                                            }
                                            px={0}
                                            py="md"
                                            autoContrast
                                            w={50}
                                            ta="center"
                                        >
                                            {stop.routes.find(route => route.id === trip.routeId)?.details.routeShortName}
                                        </Badge>
                                        <Stack gap={0}>
                                            <Text fz={{ base: 'md', sm: 'lg' }} fw="bold" inline truncate component={Link} href={`/trips/${trip.tripId}:${trip.type}`} w={{ base: 200, sm: 300, md: 400, lg: "auto" }}>
                                                {view === 'departures' ? trip.tripHeadsign : stopMap[`${trip.stopTimes[0].stopId}-${trip.type}`]?.stopName}
                                            </Text>
                                            <Group gap={0}>
                                                {trip.stopTimes[0].arrivalTime > new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8) && (
                                                    <Text size="sm"
                                                        c={trip.isDeparting ? 'green' : 'dimmed'}>{trip.isDeparting ? 'in partenza' : 'non ancora partito'}</Text>)}
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
            ) : (
                <Center mt="xl">
                    <div>Le corse di oggi sono terminate.</div>
                </Center>
            )}
            <HelpModal opened={helpOpened} onClose={helpHandlers.close} />
            <NewsModal opened={newsOpened} onClose={newsHandlers.close} news={news} />
        </Box>
    );
}