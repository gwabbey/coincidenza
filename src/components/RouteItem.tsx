import {memo} from "react";
import {Route} from "@/types";
import {Accordion, ActionIcon, Alert, Badge, Container, Flex, Grid, Text} from "@mantine/core";
import {IconAlertCircle, IconInfoSmall} from "@tabler/icons-react";
import Link from "next/link";

export const RouteItem = memo(({route, currentStop}: { route: Route; currentStop?: string | null }) => {
    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('it-IT', {
            hour: '2-digit', minute: '2-digit',
        });
    };

    const getDelayColor = (delay: number | null) => {
        if (delay === null) return 'gray';
        if (delay >= 10) return 'red';
        if (delay >= 5) return 'yellow';
        if (delay >= 0) return 'green';
        return 'grape';
    };

    return (<Accordion.Item value={route.id.toString()}>
        <Accordion.Control>
            <Badge
                size="xl"
                radius="xl"
                mr="xs"
                color={route.details.type === 'U' ? 'green' : 'blue'}
            >
                {route.details.routeShortName}
            </Badge>
            {route.details.routeLongName}
        </Accordion.Control>
        <Accordion.Panel>
            {route.details.news?.map((news, index) => (<Alert
                key={index}
                mb={16}
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
            </Alert>))}

            <div>
                {route.stops.map((route, index) => {
                    const arrivalTime = new Date(route.oraArrivoEffettivaAFermataSelezionata).getTime();
                    const currentTime = new Date().getTime();
                    const diffInMinutes = Math.floor((arrivalTime - currentTime) / (1000 * 60));
                    const isDeparting = route.delay === 0 && route.lastEventRecivedAt && route.stopTimes[0].stopId.toString() === currentStop?.toString();

                    return (<Container fluid key={index} fz={{base: 'lg', md: 'xl'}} px={0}>
                        <Grid justify="space-between" align="center">
                            <Grid.Col span="content" mt="sm">
                                <Flex direction="column" wrap={{base: "wrap", sm: "nowrap"}}
                                      w={{base: 250, xs: 450, sm: 650}}
                                >
                                    <Text inherit>
                                        {`Bus ${route.matricolaBus || ''} per\u00A0`}
                                    </Text>

                                    <Text
                                        inherit
                                        fw="bold"
                                        truncate="end"
                                        fz={{base: 'lg', md: 'xl'}}
                                        w={{base: 250, xs: 450, sm: 650}}
                                    >
                                        {route.tripHeadsign}
                                    </Text>
                                </Flex>

                                {route.stopTimes[0].arrivalTime > new Date().toLocaleTimeString('en-GB', {hour12: false}).slice(0, 8) ? (
                                    <Text
                                        c={isDeparting ? 'green' : ''}>{isDeparting ? 'in partenza' : 'non ancora partito'}</Text>) : [route.delay, route.lastEventRecivedAt, route.matricolaBus].every(item => item === null) && (
                                    <Text c="gray">dati in tempo reale non disponibili</Text>)}

                                {route.delay !== null && route.stopTimes[0].arrivalTime < new Date().toLocaleTimeString('en-GB', {hour12: false}).slice(0, 8) && (
                                    <Text c={getDelayColor(route.delay)}>
                                        {route.delay < 0 ? `${Math.abs(route.delay)} min in anticipo` : route.delay > 0 ? `${route.delay} min in ritardo` : 'in orario'}
                                    </Text>)}

                                <Text>
                                    {route.stopTimes[0].stopId.toString() === currentStop?.toString() ? 'parte' : route.stopTimes[route.stopTimes.length - 1].stopId.toString() === currentStop?.toString() ? 'arriva' : 'passa'}{' '}
                                    alle <strong>{formatTime(route.oraArrivoEffettivaAFermataSelezionata)}</strong>{' '}
                                    {diffInMinutes === 0 ? '(adesso)' : diffInMinutes < 0 ? `(${Math.abs(diffInMinutes) >= 60 ? `${Math.floor(Math.abs(diffInMinutes) / 60)} or${Math.floor(Math.abs(diffInMinutes) / 60) === 1 ? 'a' : 'e'} fa` : `${Math.abs(diffInMinutes)} minut${Math.abs(diffInMinutes) === 1 ? 'o' : 'i'} fa`})` : `(tra ${diffInMinutes >= 60 ? `${Math.floor(diffInMinutes / 60)} or${Math.floor(diffInMinutes / 60) === 1 ? 'a' : 'e'}` : `${diffInMinutes} minut${diffInMinutes === 1 ? 'o' : 'i'}`})`}
                                </Text>

                                {route.lastEventRecivedAt && (<Text c="dimmed" size="xs">
                                    Ultimo
                                    aggiornamento: {new Date(route.lastEventRecivedAt).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                }).replace(/,/g, ' - ')}
                                </Text>)}
                            </Grid.Col>
                            <Grid.Col span="content">
                                <Flex justify="flex-end" align="center">
                                    <ActionIcon variant="outline" color="gray" size="lg" radius="xl"
                                                aria-label="Info">
                                        <Link href={`/trips/${route.tripId}`}>
                                            <IconInfoSmall style={{width: '100%', height: '100%'}} stroke={1.5} />
                                        </Link>
                                    </ActionIcon>
                                </Flex>
                            </Grid.Col>
                        </Grid>
                    </Container>);
                })}
            </div>
        </Accordion.Panel>
    </Accordion.Item>);
});

RouteItem.displayName = 'RouteItem';