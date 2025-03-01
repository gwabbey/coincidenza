'use client';

import { Trip as TripProps } from "@/api/trentino-trasporti/types";
import Timeline from "@/components/timeline";
import { getDelayColor } from "@/utils";
import { Button, Card, Divider } from "@heroui/react";
import { IconAlertTriangleFilled, IconArrowUp } from "@tabler/icons-react";
import { useEffect, useState } from 'react';

const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const getCurrentMinutes = (): number => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
};

const calculatePreciseActiveIndex = (stopTimes: any[], delay: number, stopLast: number): number => {
    const currentMinutes = getCurrentMinutes();
    const lastKnownStopIndex = stopTimes.findIndex(stop => stop.stopId === stopLast);

    for (let i = 0; i < stopTimes.length - 1; i++) {
        const currentStopTime = timeToMinutes(stopTimes[i].departureTime) + delay;
        const nextStopTime = timeToMinutes(stopTimes[i + 1].departureTime) + delay;

        if (currentMinutes >= currentStopTime && currentMinutes <= nextStopTime) {
            if (i >= lastKnownStopIndex) {
                const progress = (currentMinutes - currentStopTime) / (nextStopTime - currentStopTime);
                return lastKnownStopIndex + progress;
            }

            const progress = (currentMinutes - currentStopTime) / (nextStopTime - currentStopTime);
            return i + progress;
        }

        if (currentMinutes > nextStopTime && i === lastKnownStopIndex) {
            return Math.min(lastKnownStopIndex + 0.99, stopTimes.length - 1);
        }
    }

    if (currentMinutes < timeToMinutes(stopTimes[0].departureTime) + delay) {
        return -1;
    }

    if (currentMinutes > timeToMinutes(stopTimes[stopTimes.length - 1].departureTime) + delay) {
        return lastKnownStopIndex === -1 ? stopTimes.length - 1 : lastKnownStopIndex + 0.99;
    }

    return -1;
};


export default function Trip({ trip }: { trip: TripProps }) {
    const [scroll, setScroll] = useState({ y: 0 });
    const [preciseActiveIndex, setPreciseActiveIndex] = useState(-1);

    useEffect(() => {
        const handleScroll = () => {
            setScroll({ y: window.scrollY });
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const updateIndex = () => {
            const newIndex = calculatePreciseActiveIndex(trip.stopTimes, trip.delay || 0, trip.stopLast);
            setPreciseActiveIndex(newIndex);
        };

        updateIndex();
        const intervalId = setInterval(updateIndex, 1000);

        return () => clearInterval(intervalId);
    }, [trip.stopTimes, trip.delay, trip.stopLast]);

    const activeIndex = trip.stopTimes.findIndex((stop: { stopId: number }) => stop.stopId === trip.stopLast);
    const isDeparting = trip.delay === 0 && trip.lastEventRecivedAt && activeIndex === -1;

    const calculateDuration = (arrival: string, departure: string) =>
        Math.abs(
            (new Date(0, 0, 0, ...arrival.split(':').map(Number)).getTime() -
                new Date(0, 0, 0, ...departure.split(':').map(Number)).getTime()) / 60000
        );

    const tripDuration = calculateDuration(
        trip.stopTimes[trip.stopTimes.length - 1].arrivalTime,
        trip.stopTimes[0].arrivalTime
    );

    const formatDuration = (duration: number) => {
        if (duration >= 60) {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes}min`;
        }
        return `${duration}min`;
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center text-center flex-row gap-x-2">
                <div className={`text-lg font-bold text-center rounded-small w-fit ${!trip.route?.routeColor && trip.type === "U" ? "bg-success text-white" : "bg-primary text-white"}`} style={{
                    backgroundColor: trip.route && trip.route.routeColor ? `#${trip.route.routeColor}` : "",
                    padding: "0.1rem 0.5rem"
                }}>
                    {trip.route.routeShortName}
                </div>
                <div className="text-xl font-bold">
                    {trip.stopTimes[trip.stopTimes.length - 1].stopName}
                </div>
            </div>

            <div className="md:flex hidden justify-center items-center my-4 flex-row gap-4">
                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{trip.stopTimes[0].stopName}</div>
                    <div>{trip.stopTimes[0].arrivalTime.replace(/^24:/, '00:').slice(0, 5)}</div>
                </Card>

                <div className="flex flex-row items-center justify-between gap-2">
                    <Divider className="my-4 w-16" />
                    <div className="text-center">{formatDuration(tripDuration)}</div>
                    <Divider className="my-4 w-16" />
                </div>

                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{trip.stopTimes[trip.stopTimes.length - 1].stopName}</div>
                    <div>{trip.stopTimes[trip.stopTimes.length - 1].arrivalTime.replace(/^24:/, '00:').slice(0, 5)}</div>
                </Card>
            </div>

            <div className="sticky top-0 bg-white dark:bg-black z-20">
                <Divider className="my-2" />

                <div className="flex sm:flex-col flex-row justify-between items-center gap-y-2 py-4">
                    <div className="flex flex-col">
                        {trip.stopTimes[activeIndex] &&
                            Math.floor((new Date().getTime() - new Date(trip.lastEventRecivedAt).getTime()) / (1000 * 60)) > 5 &&
                            activeIndex !== trip.stopTimes.length - 1 ? (
                            <p className={`text-lg sm:text-xl text-left sm:text-center ${activeIndex === -1 ? '' : 'italic'} truncate max-w-[230px] xs:max-w-[450px] md:max-w-full`}>
                                {trip.stopTimes.reduce((closestStop: any, stopTime: any) => {
                                    const currentTime = new Date();
                                    const [hour, minute] = stopTime.departureTime.split(':').map(Number);
                                    const stopTimeDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), hour, minute + trip.delay);
                                    return stopTimeDate <= currentTime ? stopTime : closestStop;
                                }, null)?.stopName || "--"}
                            </p>
                        ) : (
                            <p className="text-lg sm:text-xl font-bold text-left sm:text-center truncate max-w-[230px] xs:max-w-[450px] md:max-w-full">
                                {trip.stopTimes.length > 0 && !isDeparting ? trip.stopTimes[activeIndex]?.stopName : "--"}
                            </p>
                        )}

                        {!isDeparting && !trip.stopTimes[activeIndex] && (
                            <p className="text-lg sm:text-xl font-bold text-left sm:text-center truncate">
                                dati in tempo reale non disponibili
                            </p>
                        )}

                        {trip.lastEventRecivedAt && (
                            <div className="flex flex-row justify-start sm:justify-center">
                                {trip.stopTimes[activeIndex] &&
                                    Math.floor((new Date().getTime() - new Date(trip.lastEventRecivedAt).getTime()) / (1000 * 60)) > 5 &&
                                    activeIndex !== trip.stopTimes.length - 1 && (
                                        <IconAlertTriangleFilled className="text-orange-500 self-center" size={16} />
                                    )}
                                <p className="text-xs sm:text-sm text-gray-500">
                                    ultimo rilevamento: {new Date(trip.lastEventRecivedAt).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }).replace(/,/g, ' ')}
                                    {trip.matricolaBus && ` (bus ${trip.matricolaBus})`}
                                </p>
                            </div>
                        )}
                    </div>

                    {trip.delay !== null && (
                        <Button
                            className={`p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors text-white`}
                            radius="sm"
                            color={trip.lastSequenceDetection === trip.stopTimes.length ? "default" : getDelayColor(trip.delay)}
                            variant="solid"
                            disabled
                            disableRipple
                            disableAnimation
                        >
                            {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : trip.lastSequenceDetection === trip.stopTimes.length ? "arrivato" : "in orario"}
                            {trip.delay !== 0 && `${trip.delay} min`}
                        </Button>
                    )}
                </div>

                <Divider className="my-2" />
            </div>

            <div className="text-left sm:self-center">
                <Timeline
                    steps={trip.stopTimes.map((stop: any, index: number) => {
                        const isPastStop = index <= Math.floor(preciseActiveIndex);
                        const isFutureStop = index > Math.floor(preciseActiveIndex);

                        return {
                            content: (
                                <div className="flex flex-col">
                                    <span className="font-bold">{stop.stopName}</span>
                                    <div className="text-gray-500 text-sm">
                                        {stop.departureTime ? (
                                            <div className="flex gap-1">
                                                {isPastStop && (
                                                    <span>
                                                        {new Date(new Date(`2000-01-01 ${stop.departureTime}`).getTime()).toLocaleTimeString('it-IT', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                )}
                                                {isFutureStop && trip.lastEventRecivedAt && trip.delay !== 0 && (
                                                    <span className="line-through">
                                                        {new Date(new Date(`2000-01-01T${stop.departureTime.replace(/^24:/, '00:')}`).getTime()).toLocaleTimeString('it-IT', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                )}
                                                {isFutureStop && (
                                                    <span className={`font-bold text-${getDelayColor(trip.delay)}`}>
                                                        {new Date(new Date(`2000-01-01T${stop.departureTime.replace(/^24:/, '00:')}`).getTime() + (trip.delay * 60 * 1000)).toLocaleTimeString('it-IT', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div>--</div>
                                        )}
                                    </div>
                                </div>
                            ),
                        };
                    })}
                    active={preciseActiveIndex}
                />
            </div>

            {scroll.y > 0 && (
                <Button isIconOnly radius="full" startContent={<IconArrowUp size={32} />}
                    onPress={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-5 right-5 p-2 shadow-lg"
                />
            )}
        </div>
    );
}