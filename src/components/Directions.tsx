'use client';
import {Card, Flex, Pagination, Text} from "@mantine/core";
import {AnimatePresence, motion} from "framer-motion";
import {useState} from "react";
import {vehicleIcons} from "@/icons";

export default function Directions({directions}: { directions: any }) {
    const [activePage, setPage] = useState(1);

    return (
        <Flex direction="column" gap="lg" align="center" my={16}>
            <AnimatePresence initial>
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
                    <Pagination
                        autoContrast
                        color="violet.5"
                        value={activePage}
                        onChange={setPage}
                        total={directions.routes.length}
                        size={"xl"}
                    />
                </motion.div>
                {directions.routes[activePage - 1].legs[0].steps
                    // .filter((step: any) => step.travelMode !== "WALKING")
                    .map(
                        (step: any, index: number) => (
                            <motion.div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                }}
                                initial={{y: 20, opacity: 0}}
                                animate={{y: 0, opacity: 1}}
                                transition={{ease: "easeInOut", duration: 1, delay: 0.25}}
                                exit={{y: -20, opacity: 0}}
                            >
                                <Card shadow="xl" padding="lg" radius="md" withBorder key={index}
                                      opacity={step.travelMode === "WALKING" ? 0.8 : 1}>
                                    <Card.Section p={16}>
                                        {step.transitDetails ? (
                                            <Text fw={"bold"} size="xl">
                                                {vehicleIcons[step.transitDetails.line.vehicle.type as keyof typeof vehicleIcons]}&nbsp;
                                                {step.htmlInstructions.replace(
                                                    "bus",
                                                    `bus ${step.transitDetails.line.shortName}`
                                                )}
                                            </Text>
                                        ) : (
                                            <Text fw={"bold"} size="xl">
                                                {step.htmlInstructions}
                                            </Text>
                                        )}
                                        {step.transitDetails && (
                                            <>
                                                <Text size="md" c="dimmed">
                                                    {step.transitDetails.line.vehicle.name} {step.transitDetails.line.name}
                                                </Text>
                                            </>
                                        )}
                                        {step.transitDetails && (
                                            <>
                                                <Text size={"xl"}>
                                                    Programmato alle{" "}
                                                    {new Date(
                                                        step.transitDetails.departureTime.millis
                                                    ).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </Text>
                                            </>
                                        )}
                                        <Text size="md" c="dimmed">
                                            {step.distance.humanReadable} - {step.duration.humanReadable}
                                        </Text>
                                    </Card.Section>
                                </Card>
                            </motion.div>
                        )
                    )}
                <motion.div
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                    }}
                    initial={{y: 20, opacity: 0}}
                    animate={{y: 0, opacity: 1}}
                    transition={{ease: "easeInOut", duration: 1, delay: 0.25}}
                    exit={{y: -20, opacity: 0}}
                >
                    <Card shadow="xl" padding="lg" radius="md" withBorder>
                        <Card.Section p={16}>
                            <Text fw={"bold"} size="xl">
                                Percorso totale
                            </Text>
                            <Text size={"xl"}>
                                {directions.routes[activePage - 1].legs[0].distance.humanReadable} - {directions.routes[activePage - 1].legs[0].duration.humanReadable}
                            </Text>
                            <Text size={"xl"}>
                                <strong>Partenza</strong> alle <strong>{new Date(directions.routes[activePage - 1].legs[0].departureTime.millis).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}</strong> il {new Date(directions.routes[activePage - 1].legs[0].departureTime.millis).toLocaleDateString()}
                            </Text>
                            <Text size={"xl"}>
                                <strong>Arrivo</strong> alle <strong>{new Date(directions.routes[activePage - 1].legs[0].arrivalTime.millis).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}</strong> il {new Date(directions.routes[activePage - 1].legs[0].arrivalTime.millis).toLocaleDateString()}
                            </Text>
                        </Card.Section>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </Flex>
    );
}
