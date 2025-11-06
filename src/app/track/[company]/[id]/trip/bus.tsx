'use client';

import {Stop, Trip as TripProps} from "@/api/trentino-trasporti/types";
import {RouteModal} from "@/components/modal";
import Timeline from "@/components/timeline";
import {formatDate, getDelayColor} from "@/utils";
import {addToast, Button, Card, Divider, Link, useDisclosure} from "@heroui/react";
import {IconAlertTriangleFilled, IconInfoTriangleFilled} from "@tabler/icons-react";
import {useEffect, useState} from 'react';
import {Info} from "@/api/motis/types";

export const getCurrentMinutes = (): number => {
    const now = new Date(new Date().toLocaleString('it-IT', {timeZone: 'Europe/Rome'}));
    return now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
};

const timeToMinutes = (date: string): number => {
    const d = new Date(new Date(date).toLocaleString('it-IT', {timeZone: 'Europe/Rome'}));
    return d.getHours() * 60 + d.getMinutes();
};

const calculatePreciseActiveIndex = (trip: TripProps): number => {
    const currentMinutes = getCurrentMinutes();
    const lastKnownStopIndex = trip.currentStopIndex;

    for (let i = 0; i < trip.stops.length - 1; i++) {
        const currentStopTime = timeToMinutes(trip.stops[i].scheduledArrival) + trip.delay;
        const nextStopTime = timeToMinutes(trip.stops[i + 1].scheduledArrival) + trip.delay;

        if (currentMinutes >= currentStopTime && currentMinutes <= nextStopTime) {
            if (i >= lastKnownStopIndex) {
                const progress = (currentMinutes - currentStopTime) / (nextStopTime - currentStopTime);
                return lastKnownStopIndex + progress;
            }

            const progress = (currentMinutes - currentStopTime) / (nextStopTime - currentStopTime);
            return i + progress;
        }

        if (currentMinutes > nextStopTime && i === lastKnownStopIndex) {
            return Math.min(lastKnownStopIndex + 0.99, trip.stops.length - 1);
        }
    }

    if (currentMinutes < timeToMinutes(trip.stops[0].scheduledArrival) + trip.delay) {
        return -1;
    }

    if (currentMinutes > timeToMinutes(trip.stops[trip.stops.length - 1].scheduledArrival) + trip.delay) {
        return lastKnownStopIndex === -1 ? trip.stops.length - 1 : lastKnownStopIndex + 0.99;
    }

    return -1;
};

export default function Bus({trip: initialTrip}: { trip: TripProps }) {
    const [trip, setTrip] = useState(initialTrip);
    const [preciseActiveIndex, setPreciseActiveIndex] = useState(-1);
    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    useEffect(() => {
        if (trip.currentStopIndex === trip.stops.length) return;

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
    }, []);

    useEffect(() => {
        const updateIndex = () => {
            const newIndex = calculatePreciseActiveIndex(trip);
            setPreciseActiveIndex(newIndex);
        };

        updateIndex();
        const intervalId = setInterval(updateIndex, 1000);

        return () => clearInterval(intervalId);
    }, [trip.stops, trip.delay, trip.currentStopIndex]);

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
                {trip.stops[trip.stops.length - 1].name}
            </div>
        </div>

        <div className="md:flex hidden justify-center items-center my-4 flex-row gap-4">
            <Card radius="lg" className="p-4 w-64 text-center">
                <div className="font-bold truncate">{trip.stops[0].name}</div>
                <div>{formatDate(trip.stops[0].scheduledArrival)}</div>
            </Card>

            <div className="flex flex-row items-center justify-between gap-2">
                <Divider className="my-4 w-16" />
                <div className="text-center">{formatDuration(tripDuration)}</div>
                <Divider className="my-4 w-16" />
            </div>

            <Card radius="lg" className="p-4 w-64 text-center">
                <div className="font-bold truncate">{trip.stops[trip.stops.length - 1].name}</div>
                <div>{formatDate(trip.stops[trip.stops.length - 1].scheduledArrival)}</div>
            </Card>
        </div>

        <div className="sticky top-[72px] bg-white dark:bg-black z-20">
            <Divider className="my-2" />

            <div
                className="flex sm:flex-col flex-row justify-between items-center gap-y-2 py-4 w-full max-w-md mx-auto">
                <div className="flex flex-col flex-grow min-w-0">
                    <p className="text-lg font-bold text-left sm:text-center truncate flex-grow min-w-0">
                        {trip.stops.length > 0 && !isDeparting ? trip.stops[activeIndex]?.name : "--"}
                    </p>

                    {!isDeparting && !trip.stops[activeIndex] && (
                        <p className="text-lg font-bold text-center truncate flex-grow min-w-0">
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
                        className={`p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors text-white bg-${trip.currentStopIndex === trip.stops.length ? "default-400" : getDelayColor(trip.delay)}`}
                        radius="sm"
                        variant="solid"
                        disabled
                        disableRipple
                        disableAnimation
                    >
                        {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : trip.currentStopIndex === trip.stops.length ? "arrivato" : "in orario"}
                        {trip.delay !== 0 && `${trip.delay} min`}
                    </Button>
                </div>)}
            </div>

            <Divider className="my-2" />
        </div>

        <div className="flex flex-col items-center justify-center">
            {trip.info && trip.info.length > 0 && (<Button
                variant="flat"
                color="warning"
                fullWidth
                className="flex items-center font-bold sm:w-fit mx-auto mb-6 max-w-md"
                startContent={<IconInfoTriangleFilled />}
                onPress={onOpen}
            >
                Avvisi
            </Button>)}
            <Timeline
                steps={trip.stops.map((stop: Stop, index: number) => {
                    const isPastStop = index <= Math.floor(preciseActiveIndex);
                    const isFutureStop = index > Math.floor(preciseActiveIndex);
                    const isLongerStop = new Date(stop.scheduledDeparture) > new Date(stop.scheduledArrival);
                    const stopBreak = Math.round((new Date(stop.scheduledDeparture).getTime() - new Date(stop.scheduledArrival).getTime()));

                    return {
                        content: (<div className="flex flex-col">
                            <span className="font-bold">{stop.name}</span>
                            <div className="text-foreground-500 text-sm">
                                {stop.scheduledArrival ? (<div className="flex gap-1">
                                    {isPastStop && (<span>
                                                        {formatDate(stop.scheduledArrival)}
                                                    </span>)}
                                    {isFutureStop && trip.lastUpdate && trip.delay !== 0 && (
                                        <span className="line-through">
                                                        {formatDate(stop.scheduledArrival)}
                                                    </span>)}
                                    {isFutureStop && (
                                        <span className={`font-bold text-${getDelayColor(trip.delay)}`}>
                                                        {formatDate(new Date(new Date(stop.scheduledArrival).getTime() + trip.delay * 60_000).toISOString())}
                                                    </span>)}
                                </div>) : (<div>--</div>)}
                                {isLongerStop && stopBreak > 1 && (<span className="text-foreground-500">
                                                sosta di {stopBreak} minuti
                                            </span>)}
                            </div>
                        </div>),
                    };
                })}
                active={preciseActiveIndex}
            />
        </div>

        <RouteModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
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