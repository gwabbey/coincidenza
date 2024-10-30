'use client';
import {Button, Card, Divider, Flex, Text} from "@mantine/core";
import {motion} from "framer-motion";
import {useEffect, useState} from "react";
import {vehicleIcons} from "@/icons";
import Link from "next/link";
import {clearCookies} from "@/app/directions/actions";

export default function Directions({directions}: { directions: any }) {
    const [activePage, setActivePage] = useState(0);
    const [filteredRoutes, setFilteredRoutes] = useState(directions.routes);

    useEffect(() => {
        setFilteredRoutes(filteredRoutes.filter((route: any) =>
            route.legs[0].steps.some((step: any) => step.travelMode !== 'WALKING')
        ));
    }, [filteredRoutes]);

    return (
        <motion.div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
            initial={{y: 20, opacity: 0}}
            animate={{y: 0, opacity: 1}}
            transition={{ease: "easeInOut", duration: 1, delay: 0.5}}
        >
            {filteredRoutes.length > 0 ? (
                <Flex direction="column" gap="lg" align="center" my={16}>
                    <Link href="/directions" onClick={() => clearCookies()} passHref>
                        go back
                    </Link>

                    <Flex wrap="wrap" gap="xs" justify="center">
                        {filteredRoutes.map((route: any, index: number) => (
                            <Button
                                key={index}
                                variant={activePage === index ? "filled" : "outline"}
                                radius="xl"
                                size="md"
                                color={activePage === index ? "violet.5" : "violet.8"}
                                onClick={() => setActivePage(index)}
                            >
                                {new Date(
                                    route.legs[0].departureTime?.millis
                                ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </Button>
                        ))}
                    </Flex>

                    <Flex
                        wrap="wrap"
                        justify="center"
                        gap="sm"
                        mt="lg"
                        w="100%"
                    >
                        {filteredRoutes[activePage].legs[0].steps.map((step: any, index: number) => (
                            <Flex
                                key={index}
                                direction="column"
                                align="center"
                                style={{minWidth: 80}}
                            >
                                <Text size="xl">
                                    {vehicleIcons[step.transitDetails?.line?.vehicle?.type as keyof typeof vehicleIcons]}
                                </Text>
                                <Text size="md">
                                    {step.duration.humanReadable}
                                </Text>
                                <Text fw="bold" size="md">
                                    {step.transitDetails?.line?.shortName ? step.transitDetails.line.shortName : step.transitDetails?.line?.name}
                                </Text>
                            </Flex>
                        ))}
                    </Flex>

                    {filteredRoutes[activePage].legs[0].steps.map(
                        (step: any, index: number) => (
                            <motion.div
                                key={index}
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                }}
                                initial={{y: 20, opacity: 0}}
                                animate={{y: 0, opacity: 1}}
                                exit={{y: -20, opacity: 0}}
                                transition={{ease: "easeInOut", duration: 0.5}}
                            >
                                <Card
                                    shadow="xl"
                                    padding="lg"
                                    radius="md"
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
                                                "bus",
                                                `bus ${step.transitDetails?.line?.shortName ?? ""}`
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
                                            <div className="flex flex-col gap-y-2">
                                                <Text size={"xl"}>
                                                    Partenza alle{" "}<strong>
                                                    {new Date(
                                                        step.transitDetails.departureTime.millis
                                                    ).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}{" "}</strong>
                                                    da {step.transitDetails.departureStop.name}
                                                </Text>
                                                <Text size={"xl"}>
                                                    Arrivo alle{" "}<strong>
                                                    {new Date(
                                                        step.transitDetails.arrivalTime.millis
                                                    ).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}{" "}</strong>
                                                    a {step.transitDetails.arrivalStop.name}
                                                </Text>
                                            </div>
                                        )}
                                        <Text size="md" c="dimmed">
                                            {step.distance.humanReadable} - {step.duration.humanReadable}
                                        </Text>
                                    </Card.Section>
                                </Card>
                            </motion.div>
                        )
                    )}

                    <Divider size="lg" my="lg" w="100%" c="pink" />

                    <Card shadow="xl" padding="lg" radius="md" withBorder w="100%">
                        <Text size={"xl"}>
                            Viaggio di{" "}
                            {filteredRoutes[activePage].legs[0].distance.humanReadable} (
                            {filteredRoutes[activePage].legs[0].duration.humanReadable})
                        </Text>
                    </Card>
                    <Card shadow="xl" padding="lg" radius="md" withBorder w="100%">
                        {filteredRoutes[activePage].legs[0].departureTime && (
                            <Text size={"xl"}>
                                <strong>Partenza</strong> alle{" "}
                                <strong>
                                    {new Date(
                                        filteredRoutes[activePage].legs[0].departureTime?.millis
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </strong>{" "}
                                da {filteredRoutes[activePage].legs[0].startAddress}
                            </Text>
                        )}
                    </Card>
                    <Card shadow="xl" padding="lg" radius="md" withBorder w="100%">
                        <Text size={"xl"}>
                            <strong>Arrivo</strong> alle{" "}
                            <strong>
                                {new Date(
                                    filteredRoutes[activePage].legs[0].arrivalTime?.millis
                                ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </strong>{" "}
                            a {filteredRoutes[activePage].legs[0].endAddress}
                        </Text>
                    </Card>
                </Flex>) : (
                <Flex direction="column" gap="lg" align="center" my={16}>
                    <Text size="xl">
                        Nessun percorso trovato :(
                    </Text>
                </Flex>
            )}
        </motion.div>
    );
}