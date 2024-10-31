'use client';
import {Accordion, Alert, Badge, List, Text} from "@mantine/core";
import {IconAlertCircle} from "@tabler/icons-react";
import Link from "next/link";

export default function Routes({stop, currentStop}: { stop: any[], currentStop: any }) {
    return (
        <Accordion chevronPosition="right" transitionDuration={500} maw={700} w="100%">
            {stop.map((route) => (
                <Accordion.Item key={route.id} value={route.id.toString()}>
                    <Accordion.Control>
                        <Badge size="xl" radius="xl" mr="xs"
                               color={route.details.type === 'U' ? 'green' : 'blue'}>
                            {route.details.routeShortName}
                        </Badge>
                        {route.details.routeLongName}
                    </Accordion.Control>
                    <Accordion.Panel>
                        {route.details.news && route.details.news.map((news: any, index: number) => (
                            <Alert mb={16} autoContrast variant="light" color="yellow" radius="xl" title={news.header}
                                   key={index} icon={<IconAlertCircle />}>
                                {news.details}{" "}
                                {news.url && (
                                    <Link href={news.url} target="_blank">
                                        Dettagli
                                    </Link>
                                )}
                            </Alert>
                        ))}
                        <List
                            spacing="xl"
                            size="xl"
                            center
                            icon={<></>}>
                            {route.stops.map((stop: any, index: number) => (
                                <List.Item key={index}>
                                    <div>{`Bus ${stop.matricolaBus !== null ? stop.matricolaBus : ''}`} per <strong>{stop.tripHeadsign}</strong>
                                    </div>
                                    {stop.delay === null && stop.lastEventRecivedAt === null && (
                                        <Text>dati in tempo reale non disponibili</Text>
                                    )}
                                    {stop.delay === null && stop.lastEventRecivedAt !== null && (
                                        <Text>non ancora partito</Text>
                                    )}
                                    {stop.delay !== null && (
                                        <Text
                                            c={stop.delay >= 5 ? 'red' : (stop.delay >= 0 && stop.delay < 2) ? 'green' : (stop.delay > 2 && stop.delay < 5) ? 'yellow' : stop.delay < 0 ? 'grape' : 'green'}>
                                            {stop.delay < 0 ? `${Math.abs(stop.delay)} min in anticipo` : stop.delay > 0 ? `${stop.delay} min in ritardo` : 'in orario'}
                                        </Text>
                                    )}
                                    <Text>
                                        {stop.stopTimes[stop.stopTimes.length - 1].stopId.toString() === currentStop.toString() ? 'arriva' : 'passa'} alle <strong>{new Date(stop.oraArrivoEffettivaAFermataSelezionata).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}</strong> {stop.delay !== null && stop.delay !== 0 && `invece che alle ${new Date(stop.oraArrivoProgrammataAFermataSelezionata).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}`}
                                    </Text>
                                    <Text c="dimmed" size="xs">
                                        {stop.lastEventRecivedAt !== null && `Ultimo aggiornamento: ${new Date(stop.lastEventRecivedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        }).replace(/,/g, ' - ')}`}
                                    </Text>
                                </List.Item>
                            ))}
                        </List>
                    </Accordion.Panel>
                </Accordion.Item>
            ))}
        </Accordion>
    );
}