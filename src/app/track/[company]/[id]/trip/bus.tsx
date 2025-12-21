'use client';

import {Stop, Trip as TripProps} from "@/api/trentino-trasporti/types";
import {RouteModal} from "@/components/modal";
import Timeline from "@/components/timeline";
import {formatDate, getDelayColor} from "@/utils";
import {addToast, Button, Card, CardBody, Divider, Link, useDisclosure} from "@heroui/react";
import {IconAlertTriangleFilled, IconExternalLink} from "@tabler/icons-react";
import {useEffect, useState} from 'react';
import {Info} from "@/api/motis/types";
import {useRouter} from "next/navigation";

export const getCurrentMinutes = (): number => {
    return new Date().getHours() * 60 + new Date().getMinutes() + (new Date().getSeconds() / 60);
};

const timeToMinutes = (date: string): number => {
    return new Date(date).getHours() * 60 + new Date(date).getMinutes();
};

const calculatePreciseActiveIndex = (trip: TripProps): number => {
    const currentMinutes = getCurrentMinutes();
    const delay = trip.delay;
    const lastKnownStopIndex = trip.currentStopIndex;

    if (!trip.stops || trip.stops.length === 0) {
        return -1;
    }

    const normalizeTime = (timeStr: string, previousTime?: number): number => {
        let minutes = timeToMinutes(timeStr);

        if (previousTime !== undefined && minutes < previousTime - 180) {
            minutes += 1440;
        }

        return minutes;
    };

    const firstStop = trip.stops[0];
    let firstArrivalTime = timeToMinutes(firstStop.scheduledArrival) + delay;
    let firstDepartureTime = timeToMinutes(firstStop.scheduledDeparture) + delay;

    let normalizedCurrentMinutes = currentMinutes;
    if (currentMinutes < firstArrivalTime - 180) {
        normalizedCurrentMinutes = currentMinutes + 1440;
    }

    if (normalizedCurrentMinutes < firstArrivalTime) {
        return -1;
    }

    if (lastKnownStopIndex === -1 && normalizedCurrentMinutes < firstDepartureTime) {
        return 0;
    }

    const lastStop = trip.stops[trip.stops.length - 1];
    let lastArrivalTime = normalizeTime(lastStop.scheduledArrival, firstArrivalTime) + delay;

    if (normalizedCurrentMinutes >= lastArrivalTime || lastKnownStopIndex >= trip.stops.length - 1) {
        return trip.stops.length - 1;
    }

    if (lastKnownStopIndex === -1 && !trip.delay) {
        let prevTime = firstArrivalTime;

        for (let i = 0; i < trip.stops.length - 1; i++) {
            const stop = trip.stops[i];
            const next = trip.stops[i + 1];

            const stopArrival = normalizeTime(stop.scheduledArrival, prevTime) + delay;
            const stopDeparture = normalizeTime(stop.scheduledDeparture, stopArrival) + delay;
            const nextArrival = normalizeTime(next.scheduledArrival, stopDeparture) + delay;

            prevTime = nextArrival;

            if (normalizedCurrentMinutes >= stopArrival && normalizedCurrentMinutes < stopDeparture) {
                return i;
            }
            if (normalizedCurrentMinutes >= stopDeparture && normalizedCurrentMinutes < nextArrival) {
                const duration = nextArrival - stopDeparture;
                if (duration <= 0) return i;
                const progress = (normalizedCurrentMinutes - stopDeparture) / duration;
                return i + progress;
            }
        }
        return 0;
    }

    const currentStop = trip.stops[lastKnownStopIndex];
    const nextStop = trip.stops[lastKnownStopIndex + 1];

    let currentStopDeparture = normalizeTime(currentStop.scheduledDeparture, firstArrivalTime) + delay;
    let nextStopArrival = normalizeTime(nextStop.scheduledArrival, currentStopDeparture) + delay;

    if (normalizedCurrentMinutes < currentStopDeparture) {
        return lastKnownStopIndex;
    }

    if (normalizedCurrentMinutes < nextStopArrival) {
        const segmentDuration = nextStopArrival - currentStopDeparture;
        if (segmentDuration <= 0) {
            return lastKnownStopIndex;
        }
        const progress = (normalizedCurrentMinutes - currentStopDeparture) / segmentDuration;
        return lastKnownStopIndex + Math.min(progress, 0.9999);
    }

    if (normalizedCurrentMinutes >= nextStopArrival) {
        return lastKnownStopIndex + 0.9999;
    }

    return lastKnownStopIndex;
};

export default function Bus({trip: initialTrip}: { trip: TripProps }) {
    const router = useRouter();
    const [trip, setTrip] = useState(initialTrip);
    const [preciseActiveIndex, setPreciseActiveIndex] = useState(-1);
    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    useEffect(() => {
        if (trip.status === "completed") return;

        let eventSource: EventSource | undefined;
        let reconnectTimeout: NodeJS.Timeout | undefined;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        const cleanup = () => {
            eventSource?.close();
            eventSource = undefined;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = undefined;
            }
        };

        const showConnectionError = () => {
            addToast({title: "Errore durante la connessione", color: "danger"});
        };

        const setupSSE = () => {
            cleanup();
            eventSource = new EventSource(`/track/trentino-trasporti/${trip.id}/stream`);

            eventSource.onopen = () => {
                reconnectAttempts = 0;
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setTrip((prevTrip) => ({
                        ...prevTrip,
                        delay: data.delay,
                        currentStopIndex: data.currentStopIndex,
                        lastUpdate: data.lastUpdate
                    }));
                    if (data.currentStopIndex === trip.stops.length) cleanup();
                } catch (e) {
                    showConnectionError();
                    console.error('SSE error:', e);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE error:', error);
                cleanup();

                if (reconnectAttempts < maxReconnectAttempts) {
                    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
                    reconnectAttempts++;
                    reconnectTimeout = setTimeout(setupSSE, delay);
                } else {
                    showConnectionError();
                    console.error('Max reconnection attempts reached');
                }
            };
        };

        const reconnect = () => {
            if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
                reconnectAttempts = 0;
                setupSSE();
            }
        };
        window.addEventListener('focus', reconnect);

        setupSSE();

        return () => {
            window.removeEventListener('focus', reconnect);
            cleanup();
        };
    }, [initialTrip.id, initialTrip.status, initialTrip.stops.length]);

    useEffect(() => {
        const updateIndex = () => {
            setPreciseActiveIndex(calculatePreciseActiveIndex(trip));
        };

        updateIndex();
        const intervalId = setInterval(updateIndex, 1000);

        return () => clearInterval(intervalId);
    }, [trip]);

    const activeIndex = trip.currentStopIndex;
    const isDeparting = trip.lastUpdate && activeIndex === -1;

    function calculateDuration(start: string, end: string): number {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.abs((endDate.getTime() - startDate.getTime()) / 60000);
    }

    const tripDuration = calculateDuration(trip.stops[0].scheduledDeparture, trip.stops[trip.stops.length - 1].scheduledArrival);

    const formatDuration = (duration: number) => {
        if (duration >= 60) {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes > 0 ? minutes + "min" : ""}`;
        }
        return `${duration}min`;
    };

    const setCookie = (name: string, value: string) => {
        document.cookie = `${name}=${value}; path=/; expires=0`;
    };

    return (<div className="flex flex-col gap-4">
        <div className="flex justify-center items-center text-center flex-wrap gap-x-2 gap-y-1 max-w-full">
                <span
                    className="text-md font-bold rounded-small flex items-center gap-x-1 text-white whitespace-nowrap"
                    style={{
                        backgroundColor: trip.route && trip.color ? `#${trip.color}` : "", padding: "0.1rem 0.5rem"
                    }}>
                    {trip.route}
                </span>
            <div className="text-lg font-bold min-w-0 truncate">
                {trip.destination}
            </div>
        </div>

        <div className="md:flex hidden justify-center items-center my-4 flex-row gap-4">
            <Card radius="lg" className="p-4 w-64 text-center">
                <div className="font-bold truncate">{trip.origin}</div>
                <div>{formatDate(trip.stops[0].scheduledDeparture)}</div>
            </Card>

            <div className="flex flex-row items-center justify-between gap-2">
                <Divider className="my-4 w-16" />
                <div className="text-center text-nowrap">{formatDuration(tripDuration)}</div>
                <Divider className="my-4 w-16" />
            </div>

            <Card radius="lg" className="p-4 w-64 text-center">
                <div className="font-bold truncate">{trip.destination}</div>
                <div>{formatDate(trip.stops[trip.stops.length - 1].scheduledArrival)}</div>
            </Card>
        </div>

        <div className="sticky top-18 bg-white dark:bg-black z-20">
            <Divider className="my-2" />

            <div
                className="flex sm:flex-col flex-row justify-between items-center gap-y-2 py-4 w-full max-w-md mx-auto">
                <div className="flex flex-col grow min-w-0">
                    <p className="text-lg font-bold text-left sm:text-center truncate grow min-w-0">
                        {trip.stops.length > 0 && !isDeparting ? trip.stops[activeIndex]?.name : "--"}
                    </p>

                    {!isDeparting && !trip.stops[activeIndex] && (
                        <p className="text-lg font-bold text-center truncate grow min-w-0">
                            dati in tempo reale non disponibili
                        </p>)}

                    {trip.lastUpdate && (<div className="flex flex-row justify-start sm:justify-center">
                        {trip.stops[activeIndex] && Math.floor((new Date().getTime() - new Date(trip.lastUpdate).getTime()) / (1000 * 60)) > 5 && activeIndex !== trip.stops.length - 1 && (
                            <IconAlertTriangleFilled className="text-warning self-center mr-1" size={16} />)}
                        <p className="text-xs sm:text-sm text-foreground-500 truncate">
                            ultimo rilevamento: {new Date(trip.lastUpdate).toLocaleTimeString('it-IT', {
                            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
                        }).replace(/,/g, ' ')}
                            {trip.vehicleId && ` (bus ${trip.vehicleId})`}
                        </p>
                    </div>)}
                </div>

                {trip.delay !== null && (<div className="shrink-0">
                    <Button
                        className={`p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none transition-colors! text-white bg-${trip.status === "completed" ? "default-400" : getDelayColor(trip.delay)}`}
                        radius="sm"
                        variant="solid"
                        disabled
                        disableRipple
                        disableAnimation
                    >
                        {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : trip.status === "completed" ? "arrivato" : "in orario"}
                        {trip.delay !== 0 && `${trip.delay} min`}
                    </Button>
                </div>)}
            </div>

            <Divider className="my-2" />
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
            {trip.info && trip.info.length > 0 && <Card
                shadow="none"
                isFooterBlurred
                fullWidth
                className="flex flex-col bg-warning-500/50 max-w-md w-full mx-auto">
                <CardBody className="flex-1 overflow-hidden p-4">
                    <div className="flex gap-1">
                        <IconAlertTriangleFilled className="shrink-0 pt-1" />
                        <div className="flex-1">
                            {trip.info.map((alert, index) => (<div key={index} className="flex flex-col gap-2">
                                <div className="flex flex-col">
                                    <span>{alert.message} {alert.url &&
                                        <Link color="foreground" isExternal href={alert.url} className="font-bold">più
                                            info <IconExternalLink className="shrink-0 ml-1" size={16} /></Link>}</span>
                                </div>
                                {index !== trip.info.length - 1 && (<Divider className="mb-2" />)}
                            </div>))}
                        </div>
                    </div>
                </CardBody>
            </Card>}

            <Timeline
                steps={trip.stops.map((stop: Stop, index: number) => {
                    const isPastStop = index <= Math.floor(preciseActiveIndex);
                    const isFutureStop = index > Math.floor(preciseActiveIndex);
                    const stopBreak = Math.round((new Date(stop.scheduledDeparture).getTime() - new Date(stop.scheduledArrival).getTime()) / 60000);

                    return {
                        content: (<div className="flex flex-col w-full min-w-0">
                            <Link color="foreground" className="font-bold leading-none cursor-pointer" onPress={() => {
                                setCookie('lat', stop.lat);
                                setCookie('lon', stop.lon);
                                setCookie('name', stop.name);
                                router.push("/bus");
                            }}>{stop.name}</Link>
                            <div className="text-foreground-500 text-sm">
                                {stop.scheduledDeparture ? (<div className="flex gap-1">
                                    {isPastStop && (<span>
                                        {formatDate(stopBreak > 1 ? stop.scheduledArrival : stop.scheduledDeparture)}
                                    </span>)}
                                    {isFutureStop && trip.lastUpdate && trip.delay !== 0 && (
                                        <span className="line-through">
                                            {formatDate(stopBreak > 1 ? stop.scheduledArrival : stop.scheduledDeparture)}
                                        </span>)}
                                    {isFutureStop && (<span className={`font-bold text-${getDelayColor(trip.delay)}`}>
                                        {formatDate(new Date(new Date(stopBreak > 1 ? stop.scheduledArrival : stop.scheduledDeparture).getTime() + trip.delay * 60_000).toISOString())}
                                    </span>)}
                                </div>) : (<div>--</div>)}
                                {stopBreak > 1 && (<span className="text-foreground-500">
                                    sosta di {stopBreak} minuti
                                </span>)}
                            </div>
                        </div>),
                    };
                })}
                active={preciseActiveIndex}
                color={`#${trip.delay !== null ? trip.color : "36454F"}`}
            />
        </div>

        <RouteModal
            open={isOpen}
            action={onOpenChange}
            title="Avvisi sulla linea"
        >
            {trip.info && trip.info.length > 0 && trip.info.map((alert: Info, index: number) => (
                <div key={index} className="flex flex-col gap-2">
                    {alert.url ? (<Link isExternal href={alert.url}>
                        {alert.message}
                    </Link>) : (<p>
                        {alert.message}
                    </p>)}
                </div>))}
        </RouteModal>
    </div>);
}