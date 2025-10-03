'use client';

import {Trip as TripProps} from "@/api/types";
import {RouteModal} from "@/components/modal";
import Timeline from "@/components/timeline";
import {capitalize, findMatchingStation, formatDate, getDelayColor} from "@/utils";
import {Button, Card, Divider, useDisclosure} from "@heroui/react";
import {IconAlertTriangleFilled, IconInfoTriangleFilled} from "@tabler/icons-react";
import Link from "next/link";
import {useEffect, useState} from 'react';

const getCurrentMinutes = () => {
    const now = new Date();
    const time = new Date(now.toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    return (time.getDate() * 24 * 60) + (time.getHours() * 60) + time.getMinutes() + (time.getSeconds() / 60);
};

const timeToMinutes = (timeString: string, originalDate: Date) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(originalDate.toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    return (date.getDate() * 24 * 60) + (hours * 60) + minutes;
};

const calculatePreciseActiveIndex = (trip: TripProps) => {
    const delay = trip.delay || 0;
    const currentMinutes = getCurrentMinutes();
    const activeStops = trip.stops.filter(stop => stop.status !== "canceled");

    const currentStopIndex = trip.currentStopIndex === -1 ? -1 :
        activeStops.findIndex((_, i) => {
            const originalIndex = trip.stops.findIndex(s =>
                !s.status || s.status !== "canceled" &&
                trip.stops.filter(stop => stop.status !== "canceled").indexOf(s) === i
            );
            return originalIndex === trip.currentStopIndex;
        });

    if (currentStopIndex === -1) {
        const firstStopDate = new Date(activeStops[0]?.scheduledDeparture || 0);
        const firstStopMinutes = timeToMinutes(formatDate(firstStopDate.toISOString()), firstStopDate);
        if (currentMinutes < firstStopMinutes || activeStops.length === 0) return -1;
    }

    if (activeStops[activeStops.length - 1]?.actualArrival) return activeStops.length - 1;

    if (currentStopIndex !== -1) {
        const stop = activeStops[currentStopIndex];
        if (stop.actualArrival && !stop.actualDeparture) return currentStopIndex;

        if (stop.actualDeparture && currentStopIndex < activeStops.length - 1) {
            const departureDate = new Date(stop.actualDeparture || 0);
            const departureMinutes = timeToMinutes(formatDate(departureDate.toISOString()), departureDate);

            const nextArrivalDate = new Date(activeStops[currentStopIndex + 1].scheduledArrival || 0);
            const nextArrivalMinutes = timeToMinutes(formatDate(nextArrivalDate.toISOString()), nextArrivalDate) + delay;

            if (currentMinutes >= departureMinutes && currentMinutes <= nextArrivalMinutes) {
                return currentStopIndex + Math.min((currentMinutes - departureMinutes) / (nextArrivalMinutes - departureMinutes), 0.99);
            }
        } else {
            return currentStopIndex;
        }
    }

    let lastPassedStopIndex = -1;
    for (let i = 0; i < activeStops.length - 1; i++) {
        if (!activeStops[i].scheduledDeparture || !activeStops[i + 1].scheduledArrival) continue;

        if (!activeStops[i].actualDeparture) {
            if (i === currentStopIndex) return i;
            continue;
        }

        const departureDate = new Date(activeStops[i].actualDeparture || 0);
        const departureMinutes = timeToMinutes(formatDate(departureDate.toISOString()), departureDate);

        const nextStopDate = new Date(activeStops[i + 1].scheduledArrival || 0);
        const nextStopMinutes = timeToMinutes(formatDate(nextStopDate.toISOString()), nextStopDate) + delay;

        if (currentMinutes >= departureMinutes) lastPassedStopIndex = i;
        if (currentMinutes >= departureMinutes && currentMinutes <= nextStopMinutes) {
            return i + Math.min((currentMinutes - departureMinutes) / (nextStopMinutes - departureMinutes), 0.99);
        }
    }

    return lastPassedStopIndex !== -1 ? lastPassedStopIndex + 0.99 : Math.max(0, currentStopIndex);
};

export default function Trip({trip: initialTrip}: { trip: TripProps }) {
    const [trip, setTrip] = useState<TripProps>(initialTrip);
    const [preciseActiveIndex, setPreciseActiveIndex] = useState(-1);
    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    useEffect(() => {
        const updateIndex = () => {
            const newIndex = calculatePreciseActiveIndex(trip);
            setPreciseActiveIndex(newIndex);
        };
        updateIndex();
        const intervalId = setInterval(updateIndex, 1000);
        return () => clearInterval(intervalId);
    }, [trip]);

    useEffect(() => {
        if (trip.status === "completed" || trip.status === "canceled") return;

        let eventSource: EventSource | undefined;

        const setupSSE = () => {
            eventSource?.close();

            const searchParams = new URLSearchParams();
            if (trip.originId) searchParams.append("origin", trip.originId);
            if (trip.timestamp) searchParams.append("timestamp", trip.timestamp.toString());
            const queryString = searchParams.toString();

            eventSource = new EventSource(
                `/track/${trip.company}/${trip.number}/stream${queryString ? `?${queryString}` : ""}`
            );

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.error) {
                        console.error("SSE error:", data.error);
                        return;
                    }

                    setTrip((prev) => {
                        const same = JSON.stringify(prev) === JSON.stringify(data);
                        if (same) return prev;

                        return {
                            ...prev,
                            ...data,
                            lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : prev.lastUpdate,
                            stops: data.stops ?? prev.stops,
                        };
                    });

                    if (data.status === "completed" || data.status === "canceled") {
                        eventSource?.close();
                    }
                } catch (e) {
                    console.error("Error parsing SSE:", e);
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
                setTimeout(setupSSE, 2000);
            };
        };

        setupSSE();
        window.addEventListener("focus", setupSSE);

        return () => {
            window.removeEventListener("focus", setupSSE);
            eventSource?.close();
        };
    }, [trip.company, trip.number, trip.originId, trip.timestamp, trip.status]);

    function formatDuration(start: Date, end: Date): string {
        const startHours = start.getHours();
        const startMinutes = start.getMinutes();
        const endHours = end.getHours();
        const endMinutes = end.getMinutes();

        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;

        let diffMinutes = endTotalMinutes - startTotalMinutes;

        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        if (hours > 0) {
            return `${hours}h ${minutes > 0 ? minutes + "min" : ""}`;
        } else {
            return `${minutes}min`;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center text-center flex-wrap gap-x-2 gap-y-1 max-w-full">
                <span
                    className={`text-md font-bold rounded-small flex items-center gap-x-1 text-white whitespace-nowrap ${trip.category?.toLowerCase().startsWith("ic") ? "bg-primary" : "bg-danger"}`}
                    style={{padding: "0.1rem 0.5rem"}}
                >
                    {trip.category} {trip.number}
                </span>
                <div className="text-lg font-bold min-w-0 truncate">
                    {capitalize(trip.destination)}
                </div>
            </div>

            <div className="md:flex hidden justify-center items-center my-4 flex-row gap-4">
                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{trip.origin}</div>
                    <div>{formatDate(trip.departureTime)}</div>
                </Card>

                <div className="flex flex-row items-center justify-between gap-2">
                    <Divider className="my-4 w-16" />
                    <div
                        className="text-center">{formatDuration(new Date(trip.departureTime), new Date(trip.arrivalTime))}</div>
                    <Divider className="my-4 w-16" />
                </div>

                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{trip.destination}</div>
                    <div>{formatDate(trip.arrivalTime)}</div>
                </Card>
            </div>

            <div className="sticky top-0 bg-white dark:bg-black z-20">
                <Divider className="my-2" />

                <div
                    className="flex sm:flex-col flex-row justify-between items-center gap-y-2 py-4 max-w-md w-full mx-auto">
                    <div className="flex flex-col flex-grow min-w-0">
                        {trip.status !== "canceled" ? (
                            <div className="flex-col">
                                <p className={`${trip.status === "scheduled" ? "text-center" : "sm:text-center text-left"} text-lg font-bold truncate flex-grow min-w-0`}>
                                    {trip.status === "scheduled" ? "Non ancora partito" : capitalize(trip.lastKnownLocation || "--")}
                                </p>
                                {(!trip.lastUpdate && trip.delay) ? (
                                    <p className={"text-center font-bold flex-grow min-w-0"}>
                                        Partenza prevista con un ritardo di <span
                                        className={`text-${getDelayColor(trip.delay)}`}>{trip.delay}</span> min
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-lg font-bold text-center">
                                {trip.alertMessage}
                            </p>
                        )}

                        <div className="flex flex-row justify-start sm:justify-center">
                            {trip.lastUpdate && (
                                <p className="text-xs sm:text-sm text-foreground-500">
                                    ultimo rilevamento: {formatDate(trip.lastUpdate)}
                                </p>
                            )}
                        </div>
                    </div>

                    {(!["scheduled", "canceled"].includes(trip.status)) && (
                        <Button
                            className={`p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors text-white bg-${getDelayColor(trip.delay)}`}
                            radius="sm"
                            variant="solid"
                            disabled
                            disableRipple
                            disableAnimation
                        >
                            {trip.delay > 0 ? `+${trip.delay} min` : trip.delay === 0 ? 'in orario' : trip.delay < 0 ? `${trip.delay} min` : ''}
                        </Button>
                    )}
                </div>

                {
                    trip.alertMessage && trip.status !== "canceled" && (
                        <div className="text-center font-bold bg-warning-100 w-fit mx-auto">
                            {trip.alertMessage}
                        </div>
                    )
                }

                <Divider className="my-2" />
            </div>

            {
                trip.status !== "canceled" ? (
                    <div className="max-w-md w-full mx-auto">
                        {trip.info && trip.info.length > 0 && (
                            <Button
                                variant="flat"
                                color="warning"
                                fullWidth
                                className="flex items-center font-bold sm:w-fit mx-auto mb-6"
                                startContent={<IconInfoTriangleFilled />}
                                onPress={onOpen}
                            >
                                avvisi
                            </Button>
                        )}
                        <Timeline
                            steps={trip.stops.filter(stop => stop.status !== "canceled").map((stop, index) => {
                                const isFutureStop = preciseActiveIndex <= index;
                                const effectiveDelayArrival = !isFutureStop ? stop.arrivalDelay : trip.delay;
                                const effectiveDelayDeparture = !isFutureStop ? stop.departureDelay : (trip.delay >= 0 ? trip.delay : 0);

                                const expectedDepartureWithDelay = stop.scheduledDeparture ? new Date(stop.scheduledDeparture) : null;
                                const expectedArrivalWithDelay = stop.scheduledArrival ? new Date(stop.scheduledArrival) : null;

                                if (trip.delay < 0 && isFutureStop) {
                                    if (index === Math.ceil(preciseActiveIndex)) {
                                        if (expectedArrivalWithDelay) {
                                            expectedArrivalWithDelay.setMinutes(expectedArrivalWithDelay.getMinutes() + trip.delay);
                                        }
                                    } else if (index <= Math.ceil(preciseActiveIndex)) {
                                        if (expectedDepartureWithDelay && effectiveDelayDeparture) {
                                            expectedDepartureWithDelay.setMinutes(expectedDepartureWithDelay.getMinutes() + effectiveDelayDeparture);
                                        }
                                        if (expectedArrivalWithDelay && effectiveDelayArrival) {
                                            expectedArrivalWithDelay.setMinutes(expectedArrivalWithDelay.getMinutes() + effectiveDelayArrival);
                                        }
                                    }
                                } else {
                                    if (expectedDepartureWithDelay && effectiveDelayDeparture) {
                                        expectedDepartureWithDelay.setMinutes(expectedDepartureWithDelay.getMinutes() + effectiveDelayDeparture);
                                    }
                                    if (expectedArrivalWithDelay && effectiveDelayArrival) {
                                        expectedArrivalWithDelay.setMinutes(expectedArrivalWithDelay.getMinutes() + effectiveDelayArrival);
                                    }
                                }

                                const isDepartureDelayed = stop.scheduledDeparture && expectedDepartureWithDelay &&
                                    formatDate(stop.scheduledDeparture) !==
                                    formatDate(stop.actualDeparture || expectedDepartureWithDelay.toISOString());

                                const isArrivalDelayed = stop.scheduledArrival && expectedArrivalWithDelay &&
                                    formatDate(stop.scheduledArrival) !==
                                    formatDate(stop.actualArrival || expectedArrivalWithDelay.toISOString());

                                return {
                                    content: (
                                        <div className="flex items-start justify-between w-full">
                                            <div className="flex-col">
                                                <Link
                                                    className={`break-words font-bold ${stop.status === "canceled" ? "line-through" : ""}`}
                                                    href={`/departures/${findMatchingStation(stop.name) ?? ""}`}>
                                                    {stop.name}
                                                </Link>

                                                {stop.status === "not_planned" && (
                                                    <p className="text-sm text-warning font-semibold">fermata
                                                        straordinaria</p>)}

                                                <div
                                                    className={`text-foreground-500 text-sm ${stop.status === "canceled" ? "line-through" : ""}`}>
                                                    <div className="flex-col">
                                                        <div
                                                            className={`flex gap-1 ${!stop.actualArrival ? 'italic' : ''}`}>
                                                            {stop.scheduledArrival && <span>a.</span>}

                                                            {stop.scheduledArrival && (
                                                                <span className={`${isArrivalDelayed
                                                                    ? 'line-through text-foreground-500'
                                                                    : `font-bold ${(!isFutureStop && stop.actualArrival) || (isFutureStop && trip.status !== "scheduled") ? 'text-success' : ''}`
                                                                }`}>
                                                                    {formatDate(stop.scheduledArrival)}
                                                                </span>
                                                            )}

                                                            {isArrivalDelayed && stop.scheduledArrival && (
                                                                <span
                                                                    className={`font-bold ${!stop.actualArrival && !isFutureStop ? 'italic' : `text-${getDelayColor(stop.arrivalDelay || trip.delay)}`}`}>
                                                                    {formatDate(stop.actualArrival || expectedArrivalWithDelay.toISOString())}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div
                                                            className={`flex gap-1 ${!stop.actualDeparture ? 'italic' : ''}`}>
                                                            {stop.scheduledDeparture && <span>p.</span>}

                                                            {stop.scheduledDeparture && (
                                                                <span className={`${isDepartureDelayed
                                                                    ? 'line-through text-foreground-500'
                                                                    : `font-bold ${(!isFutureStop && stop.actualDeparture) || (isFutureStop && trip.status !== "scheduled") ? 'text-success' : ''}`
                                                                }`}>
                                                                    {formatDate(stop.scheduledDeparture)}
                                                                </span>
                                                            )}

                                                            {isDepartureDelayed && stop.scheduledDeparture && (
                                                                <span
                                                                    className={`font-bold ${!stop.actualDeparture && !isFutureStop ? 'italic' : `text-${getDelayColor(stop.departureDelay || trip.delay)}`}`}>
                                                                    {formatDate(stop.actualDeparture || expectedDepartureWithDelay.toISOString())}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {stop.status !== "canceled" && (
                                                <Button
                                                    className={`flex p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors whitespace-pre-wrap flex-shrink-0 ${stop.actualPlatform ? 'text-white' : 'text-foreground-500'}`}
                                                    radius="sm"
                                                    variant={stop.actualPlatform ? 'solid' : 'ghost'}
                                                    color={stop.actualPlatform ? 'success' : 'default'}
                                                    disabled
                                                    disableRipple
                                                    disableAnimation
                                                >
                                                    BIN. {stop.actualPlatform || stop.scheduledPlatform}
                                                </Button>
                                            )}
                                        </div>
                                    ),
                                };
                            })}
                            active={preciseActiveIndex}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 max-w-md mx-auto">
                        {trip.info && trip.info.filter(Boolean).map((alert, index) => (
                            <span key={index} className="flex flex-row gap-2">
                                <IconAlertTriangleFilled className="text-warning flex-shrink-0 mt-1" size={16} />
                                {alert.message}
                            </span>
                        ))}
                    </div>
                )
            }

            <RouteModal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                title="avvisi sulla linea"
            >
                {trip.info && trip.info.length > 0 && trip.info.map((alert, index) => (
                    <div key={index} className="flex flex-col">
                        <span>
                            {alert.message}
                        </span>
                        <span className="text-sm text-foreground-500">
                            {formatDate(alert.date)}
                        </span>
                    </div>
                ))}
            </RouteModal>
        </div>
    );
}