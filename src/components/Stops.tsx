'use client';
import {Accordion, Badge, List, Select, Text} from "@mantine/core";
import {Key} from "react";

export default function Stops({stops}: { stops: any[] }) {
    console.log(stops);

    return (
        <>

            <Accordion chevronPosition="right" transitionDuration={500}>
                {stops.slice(0, 15).map((stop) => (
                    <Accordion.Item key={stop.stopId} value={stop.stopId.toString()}>
                        <Accordion.Control>
                            <Text size="xl">
                                {stop.stopName}
                            </Text>
                            <Text size="md" c="dimmed" fw={400}>
                                {stop.town}
                            </Text>
                            <Text size="md" c="dimmed" fw={400}>
                                {stop.distance.toFixed(2)} km da te
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <List
                                spacing="lg"
                                size="lg"
                                center
                                icon={<></>}>
                                {stop.routes.map((route: {
                                    routeId: Key;
                                    type: string;
                                    routeShortName: string;
                                    routeLongName: string;
                                }) => (
                                    <List.Item key={route.routeId}>
                                        <Badge size="lg" radius="xl" mr="xs"
                                               color={route.type === 'U' ? 'green' : 'blue'}>
                                            {route.routeShortName}
                                        </Badge>
                                        {route.routeLongName}
                                    </List.Item>
                                ))}
                            </List>
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
            </Accordion></>
    );
}