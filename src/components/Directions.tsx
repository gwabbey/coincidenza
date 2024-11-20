'use client';
import { vehicleIcons } from "@/icons";
import { Anchor, Box, Button, Card, Divider, Flex, Grid, Stack, Text, Timeline, Title } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import MapComponent from "./map";

import { searchLocation, setCookie } from "@/api";
import { Autocomplete, ComboboxItem, Loader, OptionsFilter } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from "react";

interface Props {
    name: string;
    selected?: string;
    placeholder: string;
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
    const [data, setData] = useState<{ value: string; label: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const result = await searchLocation(query);
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
                label: [
                    location.properties.name,
                    location.properties.city,
                    location.properties.county,
                    location.properties.countrycode,
                ]
                    .filter(Boolean)
                    .join(", "),
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
        return (options as ComboboxItem[]).filter((option) => {
            const words = option.label.toLowerCase().trim().split(" ");
            return splitSearch.every((searchWord) =>
                words.some((word) => word.includes(searchWord))
            );
        });
    };

    const onLocationSelect = useCallback(async (value: string) => {
        const location = JSON.parse(value);
        const locationString = `${location.geometry.coordinates[1]},${location.geometry.coordinates[0]}`;

        await setCookie(name, locationString);
        router.refresh();
    }, [router]);

    return (
        <Autocomplete
            value={value}
            data={data}
            onChange={setValue}
            onOptionSubmit={onLocationSelect}
            rightSection={loading && <Loader size="xs" />}
            placeholder={placeholder}
            size="xl"
            disabled={disabled}
            comboboxProps={{
                transitionProps: { transition: "fade-up", duration: 200 },
            }}
            filter={optionsFilter}
            radius="xl"
        />
    );
};

export default function Directions({ directions, from, to }: { directions: any, from: string, to: string }) {
    const [activePage, setActivePage] = useState(0);

    return (
        <div>
            <Flex direction="column" align="center" w="100%" mb="xl">
                <Title order={1} maw={750} w="100%">
                    <LocationInput
                        placeholder="Partenza"
                        name="from"
                        selected={from} />
                </Title>
                <div style={{
                    borderLeft: "2px solid gray",
                    height: "50px",
                }} />
                <Title order={1} maw={750} w="100%">
                    <LocationInput
                        placeholder="Arrivo"
                        name="to"
                        selected={to} />
                </Title>
            </Flex>

            {directions.routes.length > 0 ? (
                <Flex direction="column" gap="lg" align="center" my={16}>
                    <Grid justify="center" align="center">
                        {directions.routes.map((route: any, index: number) => {
                            const changes = route.legs[0].steps.filter((step: any) => step.travelMode !== 'WALKING').length - 1;
                            return (
                                <Grid.Col key={index} span="content">
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
                        {directions.routes[activePage].legs[0].steps.map((step: any, index: number) => (
                            <Stack
                                key={index}
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

                    {directions.routes[activePage].legs[0].steps.map(
                        (step: any, index: number) => (
                            <Card
                                key={index}
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
                                        ]}
                                        &nbsp;
                                        {step.htmlInstructions.replace(
                                            "Autobus",
                                            `Bus ${step.transitDetails?.line?.shortName ?? ""}`
                                        )}
                                    </Text>
                                    {step.transitDetails && (
                                        <Text size="md" c="dimmed">
                                            {step.transitDetails.line.vehicle.type === "BUS"
                                                ? "Linea"
                                                : step.transitDetails.line.vehicle.name}{" "}
                                            {step.transitDetails.line.name}
                                        </Text>
                                    )}
                                    {step.transitDetails && (
                                        <Box my="sm">
                                            <Timeline bulletSize={24}
                                                lineWidth={2}
                                                color={step.transitDetails.type === 'U' ? 'green' : step.transitDetails.type === 'E' ? 'blue' : 'dimmed'}>
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
                                        </Box>
                                    )}
                                    <Text size="md" c="dimmed">
                                        {step.distance.humanReadable} - {step.duration.humanReadable}
                                    </Text>
                                    {step.transitDetails && step.transitDetails.line.agencies && step.transitDetails.line.agencies.length > 0 && (
                                        <Text size="md" c="dimmed">
                                            Servizio di{" "}
                                            {step.transitDetails.line.agencies.map((agency: any, index: number) => (
                                                <span key={agency.name}>
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
                        )
                    )}

                    <Divider size="lg" my="lg" w="100%" c="pink" />

                    <Card shadow="xl" padding="0" radius="xl" withBorder w="100%">
                        <MapComponent encodedPolyline={directions.routes[activePage].overviewPolyline.encodedPath} />
                    </Card>

                    <Card shadow="xl" padding="lg" radius="xl" withBorder w="100%">
                        <Text size={"xl"}>
                            Viaggio di{" "}
                            {directions.routes[activePage].legs[0].distance.humanReadable} (
                            {directions.routes[activePage].legs[0].duration.humanReadable})
                        </Text>
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
                </Flex>) : (
                <Flex direction="column" gap="lg" align="center" my={16}>
                    <Text size="xl">
                        Nessun percorso trovato :(
                    </Text>
                </Flex>
            )
            }
        </div >
    );
}