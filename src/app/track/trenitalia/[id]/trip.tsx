'use client';

import { Stop, Trip as TripProps } from "@/api/trenitalia/types";
import Timeline from "@/components/timeline";
import { trainCodeLogos } from "@/train-categories";
import { capitalize, getDelayColor } from "@/utils";
import { Button, Card, Divider } from "@heroui/react";
import { IconArrowUp } from "@tabler/icons-react";
import { formatDate } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react';

const timeToMinutes = (time: number): number => {
    const [hours, minutes] = time.toString().split(':').map(Number);
    return hours * 60 + minutes;
};

const getCurrentMinutes = (): number => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
};

const calculatePreciseActiveIndex = (stops: Stop[], delay: number, lastKnownStopId: string): number => {
    const currentMinutes = getCurrentMinutes();

    // Find the current station where the train is located (stazioneCorrente: true)
    const currentStationIndex = stops.findIndex(stop => stop.id === lastKnownStopId);

    // If we found a current station, the train is there
    if (currentStationIndex !== -1) {
        const currentStop = stops[currentStationIndex];

        // Check if train has arrived but not departed
        if (currentStop.arrivoReale && !currentStop.partenzaReale) {
            return currentStationIndex;
        }
    }

    // Process each stop to determine train location
    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const nextStop = i < stops.length - 1 ? stops[i + 1] : null;

        // Extract timestamps (convert to minutes for comparison)
        const arrivalTime = stop.arrivo_teorico ? timeToMinutes(new Date(stop.arrivo_teorico).getHours() + ':' + new Date(stop.arrivo_teorico).getMinutes()) + delay : null;
        const departureTime = stop.partenza_teorica ? timeToMinutes(new Date(stop.partenza_teorica).getHours() + ':' + new Date(stop.partenza_teorica).getMinutes()) + delay : null;
        const nextArrivalTime = nextStop?.arrivo_teorico ? timeToMinutes(new Date(nextStop.arrivo_teorico).getHours() + ':' + new Date(nextStop.arrivo_teorico).getMinutes()) + delay : null;

        // If this stop has arrivoReale but no partenzaReale, train is at this station
        if (stop.arrivoReale && !stop.partenzaReale) {
            return i;
        }

        // If we have departed from this stop but not arrived at the next one
        if (stop.partenzaReale && nextStop && !nextStop.arrivoReale) {
            // Current time is between departure from this stop and arrival at next stop
            if (departureTime && nextArrivalTime && currentMinutes >= departureTime && currentMinutes < nextArrivalTime) {
                const segmentDuration = nextArrivalTime - departureTime;
                if (segmentDuration > 0) {
                    const progress = (currentMinutes - departureTime) / segmentDuration;
                    return i + progress;
                }
            }

            // If we can't calculate precise progress, we're on the way to the next stop
            return i + 0.5;
        }

        // If this is the last stop and we've arrived
        if (i === stops.length - 1 && stop.arrivoReale) {
            return i;
        }
    }

    // If all previous stops have partenzaReale and we're before the last stop
    const lastCompletedStopIndex = findLastIndex(stops, stop => stop.partenzaReale === true);
    if (lastCompletedStopIndex !== -1 && lastCompletedStopIndex < stops.length - 1) {
        const lastCompletedStop = stops[lastCompletedStopIndex];
        const nextStop = stops[lastCompletedStopIndex + 1];

        const departureTime = lastCompletedStop.partenza_teorica ?
            timeToMinutes(new Date(lastCompletedStop.partenza_teorica).getHours() + ':' + new Date(lastCompletedStop.partenza_teorica).getMinutes()) + delay : null;
        const nextArrivalTime = nextStop.arrivo_teorico ?
            timeToMinutes(new Date(nextStop.arrivo_teorico).getHours() + ':' + new Date(nextStop.arrivo_teorico).getMinutes()) + delay : null;

        if (departureTime && nextArrivalTime) {
            const segmentDuration = nextArrivalTime - departureTime;
            if (segmentDuration > 0) {
                const progress = (currentMinutes - departureTime) / segmentDuration;
                return lastCompletedStopIndex + Math.min(progress, 0.99);
            }
        }

        return lastCompletedStopIndex + 0.5;
    }

    // If train hasn't started journey yet (before first departure)
    if (stops[0] && !stops[0].partenzaReale) {
        const firstDepartureTime = stops[0].partenza_teorica ?
            timeToMinutes(new Date(stops[0].partenza_teorica).getHours() + ':' + new Date(stops[0].partenza_teorica).getMinutes()) + delay : null;

        if (firstDepartureTime && currentMinutes < firstDepartureTime) {
            return -1;
        }
    }

    // Fallback to last known stop
    const lastKnownStopIndex = stops.findIndex(stop => stop.id === lastKnownStopId);
    if (lastKnownStopIndex !== -1) {
        return lastKnownStopIndex;
    }

    return -1;
};

// Helper function to find the last index in an array that satisfies a condition
const findLastIndex = (array, predicate) => {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
};


export default function Trip({ trip }: { trip: TripProps }) {
    const router = useRouter();
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
            const newIndex = calculatePreciseActiveIndex(trip.fermate, trip.ritardo || 0, trip.fermate[trip.fermate.length - 1].id);
            setPreciseActiveIndex(newIndex);
        };

        updateIndex();
        const intervalId = setInterval(updateIndex, 1000);

        return () => clearInterval(intervalId);
    }, [trip.fermate, trip.ritardo]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
            // TODO: better refresh
        }, parseInt(process.env.AUTO_REFRESH || '60000', 10));
        return () => clearInterval(intervalId);
    }, [router]);

    const activeIndex = 0;

    /* const calculateDuration = (arrival: string, departure: string) =>
        Math.abs(
            (new Date(0, 0, 0, ...arrival.split(':').map(Number)).getTime() -
                new Date(0, 0, 0, ...departure.split(':').map(Number)).getTime()) / 60000
        ); */
    /* 
        const tripDuration = calculateDuration(
            trip.fermate[trip.fermate.length - 1].arrivo_teorico,
            trip.fermate[0].partenza_teorica
        ); */

    const formatDuration = (duration: string) => {
        const [hours, minutes] = duration.split(':').map(Number);
        return `${hours}${hours > 0 ? 'h' : ''} ${minutes}${minutes > 1 ? 'min' : ''}`;
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center text-center flex-row gap-x-2">
                <span className="sm:text-lg text-md font-bold w-fit rounded-small flex flex-row items-center gap-x-1 bg-danger text-white" style={{
                    padding: "0.1rem 0.5rem",
                }}>
                    {trainCodeLogos.find(code => code.code === trip.categoria)?.svg ? (
                        <Image src={`https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/${trainCodeLogos.find(code => code.code === trip.categoria)?.svg}.svg`} alt={trip.compTipologiaTreno || ""} width={22} height={22} className={trainCodeLogos.find(code => code.code === trip.categoria)?.className + " flex self-center -mx-1"} />
                    ) : (
                        trip.categoria
                    )} {trip.numeroTreno}
                </span>
                <div className="text-xl font-bold">
                    {capitalize(trip.destinazione)}
                </div>
            </div>

            <div className="md:flex hidden justify-center items-center my-4 flex-row gap-4">
                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{capitalize(trip.origine)}</div>
                    <div>{formatDate(new Date(trip.orarioPartenza), 'HH:mm')}</div>
                </Card>

                <div className="flex flex-row items-center justify-between gap-2">
                    <Divider className="my-4 w-16" />
                    <div className="text-center">{formatDuration(trip.compDurata)}</div>
                    <Divider className="my-4 w-16" />
                </div>

                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{capitalize(trip.destinazione)}</div>
                    <div>{formatDate(new Date(trip.orarioArrivo), 'HH:mm')}</div>
                </Card>
            </div>

            <div className="sticky top-0 bg-white dark:bg-black z-20">
                <Divider className="my-2" />

                <div className="flex sm:flex-col flex-row justify-between items-center gap-y-2 py-4">
                    <div className="flex flex-col">
                        <p className="text-lg sm:text-xl font-bold text-left sm:text-center truncate max-w-[230px] xs:max-w-[450px] md:max-w-full">
                            {trip.nonPartito ? "non ancora partito" : capitalize(trip.stazioneUltimoRilevamento || "--")}
                        </p>

                        <div className="flex flex-row justify-start sm:justify-center">
                            {/* {trip.fermate[activeIndex] &&
                                activeIndex !== trip.fermate.length - 1 && (
                                    <IconAlertTriangleFilled className="text-orange-500 self-center" size={16} />
                                )} */}
                            {trip.compOraUltimoRilevamento !== "--" && (
                                <p className="text-xs sm:text-sm text-gray-500">
                                    ultimo rilevamento: {trip.compOraUltimoRilevamento}
                                </p>
                            )}
                        </div>
                    </div>

                    {!trip.nonPartito && (
                        <Button
                            className={`p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors text-white`}
                            radius="sm"
                            color={getDelayColor(trip.ritardo)}
                            variant="solid"
                            disabled
                            disableRipple
                            disableAnimation
                        >
                            {trip.ritardo < 0 ? '' : trip.ritardo > 0 ? '+' : "in orario"}
                            {trip.ritardo !== 0 && `${trip.ritardo} min`}
                        </Button>
                    )}
                </div>

                <Divider className="my-2" />
            </div>

            <div className="text-left sm:self-center">
                <Timeline
                    steps={trip.fermate.map((stop: Stop, index: number) => {
                        return {
                            content: (
                                <div className="grid grid-cols-[minmax(13.5em,1fr),auto] items-start gap-4">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold truncate sm:max-w-[200px]">{capitalize(stop.stazione)}</span>
                                        <div className="text-gray-500 text-sm">

                                            <div className="flex flex-col">
                                                <div className={`flex gap-1 ${!stop.arrivoReale ? 'italic' : ''}`}>
                                                    <span className={`${stop.ritardoArrivo !== 0 ? 'line-through' : 'font-bold text-success'}`}>
                                                        {stop.arrivo_teorico &&
                                                            formatDate(
                                                                new Date(
                                                                    stop.ritardoArrivo === 0 && trip.ritardo !== 0
                                                                        ? stop.arrivo_teorico + trip.ritardo * 60 * 1000
                                                                        : stop.arrivo_teorico
                                                                ),
                                                                'HH:mm'
                                                            )}
                                                    </span>
                                                    {stop.ritardoArrivo !== 0 && (
                                                        <span className={`font-bold text-${getDelayColor(stop.ritardoArrivo)}`}>
                                                            {formatDate(new Date(stop.arrivoReale || ''), 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={`flex gap-1 ${!stop.partenzaReale ? 'italic' : ''}`}>
                                                    <span className={`${stop.ritardoPartenza !== 0 ? 'line-through' : 'font-bold text-success'}`}>
                                                        {stop.partenza_teorica &&
                                                            formatDate(
                                                                new Date(
                                                                    stop.ritardoPartenza === 0 && trip.ritardo !== 0
                                                                        ? stop.partenza_teorica + trip.ritardo * 60 * 1000
                                                                        : stop.partenza_teorica
                                                                ),
                                                                'HH:mm'
                                                            )}
                                                    </span>
                                                    {stop.ritardoPartenza !== 0 && (
                                                        <span className={`font-bold text-${getDelayColor(stop.ritardoPartenza)}`}>
                                                            {formatDate(new Date(stop.partenzaReale || ''), 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                    <Button
                                        className="p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors text-white"
                                        radius="sm"
                                        variant={(stop.binarioEffettivoArrivoDescrizione || stop.binarioEffettivoPartenzaDescrizione) ? 'solid' : 'ghost'}
                                        color={(stop.binarioEffettivoArrivoDescrizione || stop.binarioEffettivoPartenzaDescrizione) ? 'success' : 'default'}
                                        disabled
                                        disableRipple
                                        disableAnimation
                                    >
                                        BIN. {index === 0 ? (stop.binarioEffettivoPartenzaDescrizione || stop.binarioProgrammatoPartenzaDescrizione) : (stop.binarioEffettivoArrivoDescrizione || stop.binarioProgrammatoArrivoDescrizione)}
                                    </Button>
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