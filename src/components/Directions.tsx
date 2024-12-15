'use client';
import { vehicleIcons } from "@/icons";
import { Anchor, Box, Button, Card, Divider, Flex, Grid, Group, OptionsFilter, Stack, Text, Timeline, Title } from "@mantine/core";
import { IconLiveView, IconMapPin } from "@tabler/icons-react";
import 'dayjs/locale/it';
import MapComponent from "./map";

import { searchLocation } from "@/api";
import { Autocomplete, Loader } from "@mantine/core";
import { DatesProvider, TimeInput } from "@mantine/dates";
import { useDebouncedValue } from "@mantine/hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
    name: string;
    selected?: string;
    placeholder?: string;
    debounceDelay?: number;
    disabled?: boolean;
}

export const LocationInput = ({
    name,
    selected = "",
    placeholder,
    debounceDelay = 200,
    disabled = false,
}: Props) => {
    const router = useRouter();
    const [value, setValue] = useState(selected);
    const [debouncedValue] = useDebouncedValue(value, debounceDelay);
    const [data, setData] = useState<{
        value: string;
        label: string;
        city?: string;
        county?: string;
        countrycode?: string;
        type?: string;
        routes?: string;
    }[]>([]);
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();

    const fetchData = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const result = await searchLocation(query);
            console.log(result);
            const locations = result.features.filter((location: {
                properties: { name: any; city: any; county: any; countrycode: any; };
            }, index: any, self: any[]) => {
                return index === self.findIndex((t) => (
                    t.properties.name === location.properties.name &&
                    t.properties.city === location.properties.city &&
                    t.properties.county === location.properties.county &&
                    t.properties.countrycode === location.properties.countrycode
                ));
            }).map((location: any) => ({
                value: JSON.stringify(location),
                label: location.properties.name,
                city: location.properties.city,
                county: location.properties.county,
                countrycode: location.properties.countrycode,
                type: location.properties.type || 'default',
                routes: [
                    location.properties.city,
                    location.properties.county,
                    location.properties.countrycode,
                ].filter(Boolean).join(', ')
            }));
            setData(locations);
        } catch (error) {
            console.error("Error fetching location data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!debouncedValue) {
            setData([]);
            return;
        }
        fetchData(debouncedValue);
    }, [debouncedValue, fetchData]);


    const optionsFilter: OptionsFilter = ({ options, search }) => {
        const splitSearch = search.toLowerCase().trim().split(" ");
        return options.filter((option) => {
            return splitSearch.every((searchWord) =>
                Object.values(option).some((value) =>
                    typeof value === 'string' && value.toLowerCase().includes(searchWord)
                )
            );
        });
    };

    const onLocationSelect = useCallback(async (value: string) => {
        const location = JSON.parse(value);
        const locationString = `${location.geometry.coordinates[1]},${location.geometry.coordinates[0]}`;
        const params = new URLSearchParams(searchParams.toString());

        if (params.has(name)) {
            params.set(name, locationString);
        } else {
            params.append(name, locationString);
        }

        router.push(`/directions?${params.toString()}`);
    }, [router, searchParams, name]);

    return (
        <Autocomplete
            value={value}
            data={data}
            onChange={setValue}
            onOptionSubmit={onLocationSelect}
            rightSection={loading ? <Loader size="xs" /> : null}
            placeholder={placeholder}
            size="xl"
            disabled={disabled}
            comboboxProps={{
                transitionProps: { transition: "fade", duration: 300 },
            }}
            filter={optionsFilter}
            radius="xl"
            styles={{
                option: {
                    padding: 0,
                    margin: 0,
                }
            }}
            renderOption={(props) => {
                const option = props.option as typeof data[number];
                return (
                    <Group justify="center" gap={0} p="xs">
                        <IconMapPin size={24} />
                        <Stack
                            align="start"
                            justify="center"
                            gap={0}
                            pos="relative"
                            pl="sm"
                        >
                            <Text size="xl">{option.label}</Text>
                            <Text size="sm" c="dimmed">{option.routes}</Text>
                        </Stack>
                    </Group>
                )
            }}
            maxDropdownHeight={300}
        />
    );
};

export default function Directions({ directions, from, to }: { directions: any, from: string, to: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ref = useRef<HTMLInputElement>(null);
    const [activePage, setActivePage] = useState(0);

    const [time, setTime] = useState(() => {
        const existingTimeParam = new Date(searchParams?.get('time') || new Date()).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit' });
        return existingTimeParam;
    });

    const handleTimeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = event.currentTarget.value;
        setTime(newTime);

        const today = new Date();
        const [hours, minutes] = newTime.split(":").map(Number);
        const isoString = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes).toISOString();
        const params = new URLSearchParams(searchParams?.toString() || "");

        params.set('time', isoString);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    return (
        <div>
            <Stack align="center" w="100%" mb="xl" gap={0}>
                <Title order={1} maw={750} w="100%">
                    <LocationInput
                        placeholder="Partenza"
                        name="from"
                        selected={from} />
                </Title>
                <Divider orientation="vertical" mx="auto" h={32} />
                <Title order={1} maw={750} w="100%">
                    <LocationInput
                        placeholder="Arrivo"
                        name="to"
                        selected={to} />
                </Title>
                <Box h={32} />
                <Title order={1} maw={750} w="100%">
                    <DatesProvider settings={{ locale: 'it', firstDayOfWeek: 1, weekendDays: [0], timezone: 'Europe/Rome' }}>
                        <TimeInput
                            value={time}
                            onChange={handleTimeChange}
                            onFocus={() => ref.current?.showPicker()}
                            ref={ref}
                            size="xl"
                            radius="xl"
                        />
                    </DatesProvider>
                </Title>
            </Stack>

            {directions && directions.routes.length > 0 ? (
                <Stack gap="lg" align="center" my={16}>
                    <Grid justify="center" align="center">
                        {directions.routes.map((route: any, index: number) => {
                            const changes = route.legs[0].steps.filter((step: any) => step.travelMode !== 'WALKING').length - 1;
                            return (
                                <Grid.Col span="content">
                                    <Button
                                        p={8}
                                        variant={activePage === index ? "filled" : "outline"}
                                        radius="lg"
                                        size="xl"
                                        color={activePage === index ? "violet.5" : "violet.8"}
                                        onClick={() => setActivePage(index)}
                                        w={100}
                                    >
                                        <Stack gap={0} align="center">
                                            <Text size="md">
                                                {route.legs[0].departureTime?.millis > 0 ? new Date(
                                                    route.legs[0].departureTime?.millis
                                                ).toLocaleTimeString('it-IT', {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }) : 'A piedi'}
                                            </Text>
                                            {changes >= 0 && (
                                                <Text size="sm" c={activePage === index ? 'white' : 'dimmed'}>
                                                    {`${changes === 0 ? 'diretto' : changes === 1 ? '1 cambio' : `${changes} cambi`}`}
                                                </Text>
                                            )}
                                        </Stack>
                                    </Button>
                                </Grid.Col>
                            )
                        })}
                    </Grid>

                    <Flex
                        wrap="wrap"
                        justify="center"
                        gap="lg"
                        w="100%"
                    >
                        {directions.routes[activePage].legs[0].steps.map((step: any) => (
                            <Stack
                                align="center"
                                justify="flex-start"
                                gap={0}
                            >
                                <Text size="xl">
                                    {vehicleIcons[step.transitDetails?.line?.vehicle?.type as keyof typeof vehicleIcons] ?? '🚆'}
                                </Text>
                                <Text size="md">
                                    {step.duration.humanReadable}
                                </Text>
                                {step.transitDetails?.line?.shortName && (
                                    <Text fw="bold" size="md">
                                        {step.transitDetails?.line?.shortName}
                                    </Text>
                                )}
                            </Stack>
                        ))}
                    </Flex>

                    <Text size="md" c="dimmed" ta="center">
                        viaggio di{" "}
                        {directions.routes[activePage].legs[0].distance.humanReadable} (
                        {directions.routes[activePage].legs[0].duration.humanReadable})
                    </Text>

                    {directions.routes[activePage].legs[0].steps.map((step: any, index: number) => (
                        <>
                            <Card
                                w="100%"
                                h="100%"
                                shadow="xl"
                                padding="lg"
                                radius="xl"
                                withBorder
                                opacity={step.travelMode === "WALKING" ? 0.8 : 1}
                            >
                                <Card.Section p={16}>
                                    <Text fw={"bold"} size="xl">
                                        {vehicleIcons[
                                            (step.transitDetails?.line?.vehicle?.type) as keyof typeof vehicleIcons
                                        ]}{" "}
                                        {step.htmlInstructions.replace(
                                            "Autobus",
                                            `Bus ${step.transitDetails?.line?.shortName ?? ""}`
                                        )}
                                    </Text>
                                    {step.transitDetails && (
                                        <Text size="md" c="dimmed">
                                            {step.transitDetails.line.vehicle.type === "BUS" && "Linea "}
                                            {step.transitDetails.line.name}
                                        </Text>
                                    )}
                                    {step.transitDetails && (
                                        <Timeline bulletSize={24} my="sm"
                                            lineWidth={2}
                                            color={step.trip && step.trip.type === 'U' ? 'green' : step.trip && step.trip.type === 'E' ? 'blue' : 'dimmed'}>
                                            <Timeline.Item title={step.transitDetails.departureStop.name}
                                                bullet={<IconMapPin size={16} />}
                                            >
                                                {new Date(
                                                    step.transitDetails.departureTime.millis
                                                ).toLocaleTimeString('it-IT', {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}</Timeline.Item>
                                            <Timeline.Item title={step.transitDetails.arrivalStop.name}
                                                bullet={<IconMapPin size={16} />}>
                                                {new Date(
                                                    step.transitDetails.arrivalTime.millis
                                                ).toLocaleTimeString('it-IT', {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}</Timeline.Item>
                                        </Timeline>
                                    )}
                                    <Text size="md" c="dimmed">
                                        {step.distance.humanReadable} - {step.duration.humanReadable}
                                    </Text>
                                    {step.trip && (
                                        <Button variant="gradient" my="sm"
                                            gradient={{ from: 'violet', to: 'indigo', deg: 90 }}
                                            radius="xl" size="xl" maw={750} w="100%" leftSection={<IconLiveView size={24} />} justify="start"
                                            component={Link} href={`/trips/${step.trip.tripId}:${step.trip.type}`}>
                                            dati in tempo reale
                                        </Button>
                                    )}
                                    {step.transitDetails && step.transitDetails.line.agencies && step.transitDetails.line.agencies.length > 0 && (
                                        <Text size="md" c="dimmed">
                                            Servizio di{" "}
                                            {step.transitDetails.line.agencies.map((agency: any, index: number) => (
                                                <span>
                                                    <Anchor href={agency.url} inherit target="_blank">
                                                        {agency.name}
                                                    </Anchor>
                                                    {index < step.transitDetails.line.agencies.length - 1 && ", "}
                                                </span>
                                            ))}
                                        </Text>
                                    )}
                                </Card.Section>
                            </Card>

                            {step.transitDetails &&
                                directions.routes[activePage].legs[0].steps[index + 1]?.transitDetails && (
                                    <Card
                                        shadow="xl"
                                        padding="xs"
                                        radius="xl"
                                        withBorder
                                    >
                                        <Text size="md" c="dimmed" ta="center">
                                            cambio di{" "}
                                            {(() => {
                                                const currentArrivalTime = step.transitDetails.arrivalTime.millis;
                                                const nextDepartureTime = directions.routes[activePage].legs[0].steps[index + 1].transitDetails.departureTime.millis;
                                                const differenceInMinutes = Math.floor((nextDepartureTime - currentArrivalTime) / (1000 * 60));

                                                const hours = Math.floor(differenceInMinutes / 60);
                                                const minutes = differenceInMinutes % 60;

                                                return hours > 0
                                                    ? `${hours} or${hours > 1 ? 'e' : 'a'} ${minutes > 0 ? ` e ${minutes} min` : ''}`
                                                    : `${minutes} min`;
                                            })()}
                                        </Text>
                                    </Card>
                                )}
                        </>
                    )
                    )}

                    <Divider size="sm" my="lg" w="100%" />

                    <Card shadow="xl" padding="0" radius="xl" withBorder w="100%">
                        <MapComponent encodedPolyline={directions.routes[activePage].overviewPolyline.encodedPath} />
                    </Card>

                    {directions.routes[activePage].legs[0].departureTime && (
                        <Card shadow="xl" padding="lg" radius="xl" withBorder w="100%">
                            <Text size={"xl"}>
                                <strong>Partenza</strong> alle{" "}
                                <strong>
                                    {new Date(
                                        directions.routes[activePage].legs[0].departureTime?.millis
                                    ).toLocaleTimeString('it-IT', {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </strong>{" "}
                                da {directions.routes[activePage].legs[0].startAddress}
                            </Text>
                        </Card>
                    )}
                    {directions.routes[activePage].legs[0].arrivalTime && (
                        <Card shadow="xl" padding="lg" radius="xl" withBorder w="100%">
                            <Text size={"xl"}>
                                <strong>Arrivo</strong> alle{" "}
                                <strong>
                                    {new Date(
                                        directions.routes[activePage].legs[0].arrivalTime?.millis
                                    ).toLocaleTimeString('it-IT', {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </strong>{" "}
                                a {directions.routes[activePage].legs[0].endAddress}
                            </Text>
                        </Card>
                    )}
                </Stack>) : (
                <Text size="xl" mt="xl" ta="center">
                    Nessun percorso trovato
                </Text>
            )}
        </div >
    );
}