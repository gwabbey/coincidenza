"use client";

import {Directions, IntermediateStop, Leg} from "@/api/motis/types";
import LeafletMap from "@/components/leaflet";
import {RouteModal} from "@/components/modal";
import Timeline from "@/components/timeline";
import {formatDuration, getDelayColor} from "@/utils";
import {Accordion, AccordionItem, Button, cn, Link, Selection, useDisclosure} from "@heroui/react";
import {IconAccessPoint, IconArrowRight, IconChevronDown, IconMap} from "@tabler/icons-react";
import {differenceInMinutes, format} from "date-fns";
import {motion} from "motion/react";
import {useEffect, useState} from "react";
import {TransportIcon} from "./icons";
import Steps from "./steps";
import {trainCategoryLongNames} from "@/train-categories";

const getLegDescription = (leg: Leg) => {
    if (leg.mode === "WALK") {
        if (!leg.distance) return `circa ${formatDuration(Math.round(leg.duration / 60))} a piedi`

        const roundedMeters = Math.round(leg.distance / 100) * 100;
        const distanceInKm = leg.distance / 1000;
        const distanceStr = distanceInKm > 1 ? `circa ${distanceInKm.toFixed(1)} km` : `circa ${roundedMeters} metri`;
        return `${formatDuration(Math.round(leg.duration / 60))} · ${distanceStr}`;
    }
    if (leg.mode === "WALK") return "";
    return trainCategoryLongNames[leg.routeLongName ?? ""] ?? leg.routeLongName;
};

export default function Results({directions}: { directions: Directions }) {
    const infoModal = useDisclosure();
    const mapModal = useDisclosure();
    const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));

    const openModal = (leg: Leg, modalType: 'map' | 'info') => {
        setSelectedLeg(leg);
        if (modalType === 'map') {
            mapModal.onOpen();
        } else {
            infoModal.onOpen();
        }
    };

    useEffect(() => {
        setSelectedKeys(new Set([]));
    }, [directions]);

    console.log(directions)

    return (
        <Accordion variant="splitted" className="px-0 w-full mx-auto" selectedKeys={selectedKeys}
                   onSelectionChange={setSelectedKeys}>
            {directions.trips.map((trip, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="z-10"
                               title={
                                   <div className="flex flex-col gap-1">
                                       <Steps trip={trip} />
                                       <span className="font-bold text-2xl flex flex-row items-center gap-x-2">
                                           <span
                                               className={cn(`text-${getDelayColor(trip.legs[trip.legs.length > 1 ? 1 : 0].realTime.delay)}`)}>
                                {format(new Date(trip.startTime), "HH:mm")}
                                           </span>
                                           <IconArrowRight className="shrink-0" />
                                           <span
                                               className={cn(
                                                   `text-${getDelayColor(trip.legs[trip.legs.length - 1].realTime.delay || trip.legs[trip.legs.length - 2].realTime.delay
                                                       && differenceInMinutes(trip.endTime, new Date(trip.legs[trip.legs.length - 1].scheduledEndTime)))}`)}>
                                               {format(new Date(trip.endTime), "HH:mm")}
                                           </span>
                            </span>
                                   </div>
                               }
                               subtitle={
                                   <div className="flex flex-col gap-1">
                                       {(() => {
                                           let effectiveDuration = trip.duration;
                                           const firstLeg = trip.legs[0];
                                           const transfers = trip.legs.filter(leg => leg.mode !== "WALK").length - 1;
                                           const duration = formatDuration(effectiveDuration);

                                           if (trip.legs.length === 1 && firstLeg.mode === "WALK")
                                               return `circa ${duration} a piedi`;

                                           return `${duration} · ${transfers < 1
                                               ? "nessun cambio"
                                               : transfers + " " + (transfers > 1 ? "cambi" : "cambio")
                                           }`;
                                       })()}
                                   </div>
                               }
                >
                    <div className="flex flex-col space-y-8 pb-4">
                        {trip.legs
                            .map((leg, index) => (
                                <div key={index} className="flex flex-col gap-4">
                                    <div className="flex flex-row justify-between">
                                        <div className="flex flex-row gap-2 items-center">
                                            <TransportIcon type={leg.mode} size={24} />
                                            <div className="flex flex-col justify-center">
                                                {leg.mode !== "WALK" ? (
                                                    <div className="flex flex-row items-center gap-x-1 flex-wrap">
                                                        <span
                                                            className="sm:text-lg text-md font-bold w-fit rounded-small flex flex-row items-center gap-x-1 text-white"
                                                            style={{
                                                                backgroundColor: leg.routeColor ? `#${leg.routeColor}`
                                                                    : leg.mode === "BUS" ? "#016FEE" : "red",
                                                                padding: "0.1rem 0.5rem",
                                                                textAlign: leg.routeColor ? "center" : "left",
                                                                color: leg.routeColor ? "white" : "inherit",
                                                            }}> {leg.routeShortName} {leg.tripShortName}
                                                        </span>
                                                        <span className="sm:text-lg text-md font-bold">
                                                            {leg.headsign}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="sm:text-lg text-md font-bold">
                                                        cammina fino a {leg.to.name.toLowerCase() !== "end" ? leg.to.name : "destinazione"}
                                                    </span>
                                                )}
                                                <span className="text-foreground-500 text-sm">
                                                    {getLegDescription(leg)}
                                                </span>
                                            </div>
                                        </div>
                                        {leg.mode !== "WALK" && leg.realTime.url /*  && leg.realtime?.status === "tracked"  */ && (
                                            <Button
                                                as={Link}
                                                href={leg.realTime.url}
                                                variant="bordered"
                                                isIconOnly
                                                isExternal
                                                startContent={<IconAccessPoint />}
                                                radius="full"
                                                className="border-gray-500 border-1 self-center"
                                                aria-label={`${leg.routeLongName || ""} ${leg.tripShortName || ""} in tempo reale`}
                                            />
                                        )}
                                        {leg.mode === "WALK" && (
                                            <Button
                                                as={Link}
                                                href={`https://maps.apple.com/?saddr=${leg.from.lat},${leg.from.lon}&daddr=${leg.to.lat},${leg.to.lon}&dirflg=w`}
                                                variant="bordered"
                                                isIconOnly
                                                isExternal
                                                startContent={<IconMap />}
                                                radius="full"
                                                className="border-gray-500 border-1 self-center"
                                                aria-label={`${leg.mode || ""} ${leg.routeShortName || ""} in tempo reale`}
                                            />
                                        )}
                                    </div>
                                    {leg.mode !== "WALK" && (
                                        <div className="pl-10 flex flex-col gap-4">
                                            {/* {leg.realTime && leg.realTime?.info.length > 0 && (
                                                <Button
                                                    variant="flat"
                                                    color="warning"
                                                    className="flex items-center font-bold sm:w-fit"
                                                    startContent={<IconInfoTriangleFilled />}
                                                    onPress={() => openModal(leg, 'info')}
                                                >
                                                    avvisi
                                                </Button>
                                            )} */}

                                            {/* <LeafletMap leg={leg} className="hidden sm:flex rounded-small" /> */}

                                            {/* <Button
                                                variant="flat"
                                                color="primary"
                                                className="flex items-center font-bold sm:hidden"
                                                startContent={<IconMap />}
                                                onPress={() => openModal(leg, 'map')}
                                            >
                                                vedi sulla mappa
                                            </Button> */}

                                            {/*{leg.realTime.tracked && (
                                                <span className="flex flex-row items-center gap-x-1">
                                                    <div className="relative inline-flex">
                                                        <div
                                                            className="rounded-full bg-green-400 h-[8px] w-[8px] inline-block mr-1"></div>
                                                        <div
                                                            className="absolute animate-ping rounded-full bg-green-400 h-[8px] w-[8px] mr-1"></div>
                                                    </div>
                                                    <span
                                                        className={`font-bold text-sm text-${getDelayColor(leg.realTime.delay)}`}>
                                                        {typeof leg.realTime?.delay === "number" && leg.realTime.delay !== 0 && (
                                                            <>
                                                                {formatDuration(Math.abs(leg.realTime.delay), true)} in{" "}
                                                                {leg.realTime.delay > 0 ? "ritardo" : "anticipo"}
                                                            </>
                                                        )}
                                                        {leg.realTime?.delay === 0 && "in orario"}
                                                    </span>
                                                </span>
                                            )}*/}

                                            <Timeline steps={[{
                                                content: (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.from.name}
                                                        </span>
                                                        <div className="flex gap-1 items-center">
                                                            <span
                                                                className={`text-sm ${leg.realTime.delay === 0
                                                                    ? "font-bold text-success"
                                                                    : leg.realTime.delay
                                                                        ? "line-through text-foreground-500"
                                                                        : "text-foreground-500"
                                                                }`}
                                                            >
                                                                {format(new Date(leg.scheduledStartTime), "HH:mm")}
                                                            </span>
                                                            {leg.realTime && leg.realTime.delay !== 0 && leg.realTime.delay !== null && (
                                                                <span
                                                                    className={`font-bold text-sm text-${getDelayColor(leg.realTime?.delay)}`}>
                                                                    {format(new Date(leg.scheduledStartTime).getTime() + (leg.realTime?.delay * 60 * 1000), "HH:mm")}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div
                                                            className={`flex items-center justify-start pt-4 -mb-2 ${leg.intermediateStops && leg.intermediateStops.length > 0 ? "cursor-pointer" : ""}`}
                                                            onClick={() => {
                                                                const newSelectedKeys = new Set(selectedKeys);
                                                                const currentKey = `item-${index}-leg-stops`;
                                                                if (Array.from(selectedKeys).includes(currentKey)) {
                                                                    newSelectedKeys.delete(currentKey);
                                                                } else {
                                                                    newSelectedKeys.add(currentKey);
                                                                }
                                                                leg.intermediateStops && leg.intermediateStops.length > 0 && setSelectedKeys(newSelectedKeys);
                                                            }}
                                                        >
                                                            <span
                                                                className="text-foreground-500 text-sm leading-none z-10">
                                                                {leg.intermediateStops && leg.intermediateStops.length === 0 ? "nessuna" : leg.intermediateStops && leg.intermediateStops.length} fermat{leg.intermediateStops && leg.intermediateStops.length <= 1 ? "a" : "e"}, {formatDuration(Math.round(leg.duration / 60))}
                                                            </span>
                                                            {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                                                                <motion.div
                                                                    animate={{rotate: Array.from(selectedKeys).includes(`item-${index}-leg-stops`) ? 180 : 0}}
                                                                    transition={{duration: 0.3}}
                                                                    className="ml-1"
                                                                >
                                                                    <IconChevronDown size={16}
                                                                                     className="text-foreground-500" />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <motion.div
                                                            initial={{height: 0, opacity: 0}}
                                                            animate={{
                                                                height: Array.from(selectedKeys).includes(`item-${index}-leg-stops`) ? "auto" : 0,
                                                                opacity: Array.from(selectedKeys).includes(`item-${index}-leg-stops`) ? 1 : 0
                                                            }}
                                                            transition={{duration: 0.3, ease: "easeInOut"}}
                                                        >
                                                            <div className="text-sm text-foreground-500 pt-6">
                                                                {leg.intermediateStops && leg.intermediateStops.map((stop: IntermediateStop) => (
                                                                    <ul key={stop.stopId} className="list-disc ml-4">
                                                                        <li>{stop.name} ({format(new Date(stop.departure).getTime() + ((leg.realTime?.delay || 0) * 60 * 1000), "HH:mm")})</li>
                                                                    </ul>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    </div>
                                                )
                                            },
                                                {
                                                    content: (
                                                        <div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.to.name}
                                                        </span>
                                                            <div className="flex gap-1 items-center">
                                                            <span
                                                                className={`text-sm ${leg.realTime?.delay === 0
                                                                    ? "font-bold text-success"
                                                                    : leg.realTime?.delay
                                                                        ? "line-through text-foreground-500"
                                                                        : "text-foreground-500"
                                                                }`}
                                                            >
                                                                {format(new Date(leg.scheduledEndTime), "HH:mm")}
                                                            </span>
                                                                {leg.realTime && leg.realTime?.delay !== 0 && leg.realTime?.delay !== null && (
                                                                    <span
                                                                        className={`font-bold text-sm text-${getDelayColor(leg.realTime?.delay)}`}>
                                                                    {format(new Date(leg.scheduledEndTime).getTime() + (leg.realTime?.delay * 60 * 1000), "HH:mm")}
                                                                </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                }]} active={-1} />
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>

                    <RouteModal
                        isOpen={mapModal.isOpen}
                        onOpenChange={mapModal.onOpenChange}
                        title="mappa percorso"
                    >
                        {selectedLeg && <LeafletMap leg={selectedLeg} className="rounded-small" />}
                    </RouteModal>

                    <RouteModal
                        isOpen={infoModal.isOpen}
                        onOpenChange={infoModal.onOpenChange}
                        title="avvisi sulla linea"
                    >
                        a
                        {/* {selectedLeg && selectedLeg.realtime?.info && selectedLeg.realtime?.info.map((alert: any, index: number) => (
                            <div key={index} className="flex flex-col gap-2">
                                {alert.url ? (
                                    <Link isExternal showAnchorIcon href={alert.url} anchorIcon={<IconExternalLink className="flex-shrink-0 ml-2" size={16} />}>
                                        {alert.message}
                                    </Link>
                                ) : (
                                    <span>
                                        {alert.message}
                                    </span>
                                )}
                            </div>
                        ))} */}
                    </RouteModal>
                </AccordionItem>
            ))
            }
        </Accordion>
    );
}