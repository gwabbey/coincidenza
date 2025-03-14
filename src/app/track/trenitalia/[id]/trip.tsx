'use client';

import { Canvas, Stop, Trip as TripProps } from "@/api/trenitalia/types";
import Timeline from "@/components/timeline";
import stations from "@/stations.json";
import { trainCodeLogos } from "@/train-categories";
import { capitalize, getDelayColor } from "@/utils";
import { Button, Card, Divider } from "@heroui/react";
import { IconAlertTriangleFilled, IconArrowUp } from "@tabler/icons-react";
import { formatDate } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react';

const timeToMinutes = (timeString: string, date: Date) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (date.getDate() * 24 * 60) + (hours * 60) + minutes;
};

const getCurrentMinutes = () => {
    const now = new Date();
    return (now.getDate() * 24 * 60) + (now.getHours() * 60) + now.getMinutes() + (now.getSeconds() / 60);
};

function normalizeStationName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\bc\.? ?le\b/g, "centrale")
        .replace("posto comunicazione", "pc")
        .replace(/[`'']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function findMatchingStation(stationName: string): string | null {
    if (!stationName || stationName.trim() === '') {
        return null;
    }

    const normalizedInput = normalizeStationName(stationName);

    for (const [id, name] of Object.entries(stations)) {
        const normalizedStation = normalizeStationName(name);
        if (normalizedInput === normalizedStation) {
            return id;
        }
    }

    for (const [id, name] of Object.entries(stations)) {
        const normalizedStation = normalizeStationName(name);
        const stationWords = normalizedStation.split(' ');

        if (stationWords.includes(normalizedInput)) {
            return id;
        }
    }

    return null;
}

const calculatePreciseActiveIndex = (stops: Stop[], canvas: Canvas[], delay: number) => {
    const currentMinutes = getCurrentMinutes();
    const currentStation = canvas.find(item => item.stazioneCorrente);
    const currentStopIndex = currentStation ? stops.findIndex(stop => stop.id === currentStation.id) : -1;

    const firstStopDate = new Date(stops[0].partenza_teorica || 0);
    const firstStopMinutes = timeToMinutes(formatDate(firstStopDate, 'HH:mm'), firstStopDate);
    if (currentMinutes < firstStopMinutes) return -1;

    if (stops[stops.length - 1].arrivoReale) return stops.length - 1;

    if (currentStopIndex !== -1) {
        const stop = stops[currentStopIndex];
        if (stop.arrivoReale && !stop.partenzaReale) return currentStopIndex;

        if (stop.partenzaReale && currentStopIndex < stops.length - 1) {
            const departureDate = new Date(stop.partenzaReale || 0);
            const departureMinutes = timeToMinutes(formatDate(departureDate, 'HH:mm'), departureDate);

            const nextArrivalDate = new Date(stops[currentStopIndex + 1].arrivo_teorico || 0);
            const nextArrivalMinutes = timeToMinutes(formatDate(nextArrivalDate, 'HH:mm'), nextArrivalDate) + delay;

            if (currentMinutes >= departureMinutes && currentMinutes <= nextArrivalMinutes) {
                return currentStopIndex + Math.min((currentMinutes - departureMinutes) / (nextArrivalMinutes - departureMinutes), 0.99);
            }
        } else {
            return currentStopIndex;
        }
    }

    let lastPassedStopIndex = -1;
    for (let i = 0; i < stops.length - 1; i++) {
        if (!stops[i].partenza_teorica || !stops[i + 1].arrivo_teorico) continue;

        if (!stops[i].partenzaReale) {
            if (i === currentStopIndex) return i;
            continue;
        }

        const departureDate = new Date(stops[i].partenzaReale || 0);
        const departureMinutes = timeToMinutes(formatDate(departureDate, 'HH:mm'), departureDate);

        const nextStopDate = new Date(stops[i + 1].arrivo_teorico || 0);
        const nextStopMinutes = timeToMinutes(formatDate(nextStopDate, 'HH:mm'), nextStopDate) + delay;

        if (currentMinutes >= departureMinutes) lastPassedStopIndex = i;
        if (currentMinutes >= departureMinutes && currentMinutes <= nextStopMinutes) {
            return i + Math.min((currentMinutes - departureMinutes) / (nextStopMinutes - departureMinutes), 0.99);
        }
    }

    return lastPassedStopIndex !== -1 ? lastPassedStopIndex + 0.99 : Math.max(0, currentStopIndex);
};

export default function Trip({ trip }: { trip: TripProps }) {
    console.log(trip)
    const router = useRouter();
    const [scroll, setScroll] = useState({ y: 0 });
    const [preciseActiveIndex, setPreciseActiveIndex] = useState(-1);
    const isCanceled = trip.provvedimento === 1

    useEffect(() => {
        const handleScroll = () => {
            setScroll({ y: window.scrollY });
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const updateIndex = () => {
            const newIndex = calculatePreciseActiveIndex(trip.fermate, trip.canvas, trip.ritardo || 0);
            setPreciseActiveIndex(newIndex);
        };

        updateIndex();
        const intervalId = setInterval(updateIndex, 1000);

        return () => clearInterval(intervalId);
    }, [trip.fermate, trip.ritardo]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, parseInt(process.env.AUTO_REFRESH || '10000', 10));
        return () => clearInterval(intervalId);
    }, [router]);

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
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes}min`;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center text-center flex-row gap-x-2">
                <span className={`sm:text-lg text-md font-bold w-fit rounded-small flex flex-row items-center gap-x-1 text-white ${trip.categoria.toLowerCase().startsWith("ic") ? "bg-primary-200" : "bg-danger"}`} style={{
                    padding: "0.1rem 0.5rem",
                }}>
                    {trainCodeLogos.find(code => code.code === trip.categoria)?.url ? (
                        <Image
                            src={trainCodeLogos.find(code => code.code === trip.categoria)?.url ?? ""}
                            alt={trip.compTipologiaTreno || ""}
                            width={100}
                            height={20}
                            className={trainCodeLogos.find(code => code.code === trip.categoria)?.className + " flex self-center h-5 w-full"}
                        />
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
                    <div className="font-bold truncate">{capitalize(trip.origineEstera || trip.origine)}</div>
                    <div>{formatDate(new Date(trip.oraPartenzaEstera || trip.orarioPartenza), 'HH:mm')}</div>
                </Card>

                <div className="flex flex-row items-center justify-between gap-2">
                    <Divider className="my-4 w-16" />
                    <div className="text-center">{formatDuration(new Date(trip.oraPartenzaEstera || trip.orarioPartenza), new Date(trip.oraArrivoEstera || trip.orarioArrivo))}</div>
                    <Divider className="my-4 w-16" />
                </div>

                <Card radius="lg" className="p-4 w-64 text-center">
                    <div className="font-bold truncate">{capitalize(trip.destinazioneEstera || trip.destinazione)}</div>
                    <div>{formatDate(new Date(trip.oraArrivoEstera || trip.orarioArrivo), 'HH:mm')}</div>
                </Card>
            </div>

            <div className="sticky top-0 bg-white dark:bg-black z-20">
                <Divider className="my-2" />

                <div className="flex sm:flex-col flex-row justify-between items-center gap-y-2 py-4 max-w-md w-full mx-auto">
                    <div className="flex flex-col flex-grow min-w-0">
                        {!isCanceled ? (
                            <p className="text-lg sm:text-xl font-bold text-left sm:text-center truncate flex-grow min-w-0">
                                {trip.nonPartito ? "non ancora partito" : capitalize(trip.stazioneUltimoRilevamento || "--")}
                            </p>
                        ) : (
                            <p className="text-xl font-bold text-center">
                                {trip.subTitle.toLowerCase()}
                            </p>
                        )}

                        <div className="flex flex-row justify-start sm:justify-center">
                            {trip.compOraUltimoRilevamento !== "--" && (
                                <p className="text-xs sm:text-sm text-gray-500">
                                    ultimo rilevamento: {trip.compOraUltimoRilevamento}
                                </p>
                            )}
                        </div>
                    </div>

                    {!trip.nonPartito && (
                        <Button
                            className={`p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors text-white bg-${getDelayColor(trip.ritardo)}`}
                            radius="sm"
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

                {trip.subTitle && !isCanceled && (
                    <div className="text-center font-bold bg-warning-100 w-fit mx-auto">
                        {trip.subTitle}
                    </div>
                )}

                {trip.provvedimenti && (
                    <div className="text-center font-bold">
                        {trip.provvedimenti}
                    </div>
                )}

                <Divider className="my-2" />
            </div>

            {!isCanceled ? (
                <div className="max-w-md w-full mx-auto">
                    <Timeline
                        steps={trip.fermate.map((stop: Stop, index: number) => {
                            const isFutureStop = preciseActiveIndex <= index;

                            const effectiveDelayArrival = !isFutureStop ? stop.ritardoArrivo :
                                (trip.ritardo >= 0 ? trip.ritardo : 0);

                            const effectiveDelayDeparture = !isFutureStop ? stop.ritardoPartenza :
                                (trip.ritardo >= 0 ? trip.ritardo : 0);

                            const isDepartureDelayed = stop.partenza_teorica &&
                                formatDate(new Date(stop.partenza_teorica), 'HH:mm') !==
                                formatDate(new Date(stop.partenzaReale || stop.partenza_teorica + effectiveDelayDeparture * 60 * 1000), 'HH:mm');

                            const isArrivalDelayed = stop.arrivo_teorico &&
                                formatDate(new Date(stop.arrivo_teorico), 'HH:mm') !==
                                formatDate(new Date(stop.arrivoReale || stop.arrivo_teorico + effectiveDelayArrival * 60 * 1000), 'HH:mm');

                            return {
                                content: (
                                    <div className="flex items-start justify-between w-full">
                                        <div className="flex-col">
                                            <Link className={`break-words font-bold ${stop.actualFermataType === 3 ? "line-through" : ""}`} href={`/departures/${findMatchingStation(stop.stazione) ?? ""}`}>
                                                {capitalize(stop.stazione)}
                                            </Link>
                                            <div className={`text-gray-500 text-sm ${stop.actualFermataType === 3 ? "line-through" : ""}`}>

                                                <div className="flex-col">
                                                    <div className={`flex gap-1 ${!stop.arrivoReale && isFutureStop ? 'italic' : ''}`}>
                                                        {stop.arrivo_teorico && <span>a.</span>}

                                                        {stop.arrivo_teorico && (
                                                            <span className={`${isArrivalDelayed
                                                                ? 'line-through text-gray-500'
                                                                : `font-bold ${(!isFutureStop || (isFutureStop && trip.ritardo === 0 && !trip.nonPartito)) ? 'text-success' : ''}`
                                                                }`}>
                                                                {formatDate(new Date(stop.arrivo_teorico), 'HH:mm')}
                                                            </span>
                                                        )}

                                                        {isArrivalDelayed && stop.arrivo_teorico && (
                                                            <span className={`font-bold ${!stop.arrivoReale && isFutureStop ? 'italic' : ''} text-${getDelayColor(stop.ritardoArrivo || trip.ritardo)}`}>
                                                                {formatDate(new Date(stop.arrivoReale || stop.arrivo_teorico + effectiveDelayArrival * 60 * 1000), 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className={`flex gap-1 ${!stop.partenzaReale && isFutureStop ? 'italic' : ''}`}>
                                                        {stop.partenza_teorica && <span>p.</span>}

                                                        {stop.partenza_teorica && (
                                                            <span className={`${isDepartureDelayed
                                                                ? 'line-through text-gray-500'
                                                                : `font-bold ${(!isFutureStop || (isFutureStop && trip.ritardo === 0 && !trip.nonPartito)) ? 'text-success' : ''}`
                                                                }`}>
                                                                {formatDate(new Date(stop.partenza_teorica), 'HH:mm')}
                                                            </span>
                                                        )}

                                                        {isDepartureDelayed && stop.partenza_teorica && (
                                                            <span className={`font-bold ${!stop.partenzaReale && isFutureStop ? 'italic' : ''} text-${getDelayColor(stop.ritardoPartenza || trip.ritardo)}`}>
                                                                {formatDate(new Date(stop.partenzaReale || stop.partenza_teorica + effectiveDelayDeparture * 60 * 1000), 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {stop.actualFermataType !== 3 && (
                                            <Button
                                                className={`flex p-1 h-auto w-auto uppercase font-bold text-md pointer-events-none !transition-colors whitespace-pre-wrap flex-shrink-0 ${stop.binarioEffettivoArrivoDescrizione || stop.binarioEffettivoPartenzaDescrizione ? 'text-white' : 'text-gray-500'}`}
                                                radius="sm"
                                                variant={(stop.binarioEffettivoArrivoDescrizione || stop.binarioEffettivoPartenzaDescrizione) ? 'solid' : 'ghost'}
                                                color={(stop.binarioEffettivoArrivoDescrizione || stop.binarioEffettivoPartenzaDescrizione) ? 'success' : 'default'}
                                                disabled
                                                disableRipple
                                                disableAnimation
                                            >
                                                BIN. {index === 0 ? (stop.binarioEffettivoPartenzaDescrizione || stop.binarioProgrammatoPartenzaDescrizione) : (stop.binarioEffettivoArrivoDescrizione || stop.binarioProgrammatoArrivoDescrizione)}
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
                <div className="flex flex-col gap-2">
                    {trip.info.slice(0, 2).filter(Boolean).map((alert, index) => (
                        <span key={index} className="flex flex-row gap-2">
                            <IconAlertTriangleFilled className="text-warning flex-shrink-0 mt-1" size={16} />
                            {alert.infoNote}
                        </span>
                    ))}
                </div>
            )}

            {
                scroll.y > 0 && (
                    <Button isIconOnly radius="full" startContent={<IconArrowUp size={32} />}
                        onPress={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-5 right-5 p-2 shadow-lg"
                    />
                )
            }
        </div >
    );
}