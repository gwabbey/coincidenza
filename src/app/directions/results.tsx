"use client";

import {Directions, IntermediateStop, Leg} from "@/api/motis/types";
import Timeline from "@/components/timeline";
import {formatDuration, getDelayColor} from "@/utils";
import {Accordion, AccordionItem, Button, cn, Divider, Selection} from "@heroui/react";
import {IconAccessPoint, IconAlertTriangle, IconArrowRight, IconExternalLink, IconMap} from "@tabler/icons-react";
import {format} from "date-fns";
import Link from "next/link";
import {TransportIcon} from "./icons";
import Steps from "./steps";
import {trainCategoryLongNames} from "@/train-categories";

const getLegDescription = (leg: Leg) => {
    if (leg.mode === "WALK") {
        if (!leg.distance) return `circa ${formatDuration(Math.round(leg.duration / 60))} a piedi`

        const roundedMeters = Math.round(leg.distance / 100) * 100;
        const distanceInKm = leg.distance / 1000;
        const distanceStr = distanceInKm > 1 ? `circa ${Number(distanceInKm.toFixed(1))} km` : `circa ${roundedMeters} metri`;
        return `${formatDuration(Math.round(leg.duration / 60))} · ${distanceStr}`;
    }
    if (leg.mode === "WALK") return "";
    return trainCategoryLongNames[leg.routeLongName ?? ""] ?? leg.routeLongName;
};

interface ResultsProps {
    directions: Directions;
    selectedTripIndex: number | null;
    onTripSelect: (index: number | null) => void;
}

export default function Results({directions, selectedTripIndex, onTripSelect}: ResultsProps) {
    const handleSelectionChange = (keys: Selection) => {
        if (keys === "all") {
            onTripSelect(null);
        } else {
            const selectedKey = Array.from(keys as Set<string>)[0];
            if (selectedKey === undefined) {
                onTripSelect(null);
            } else {
                onTripSelect(Number(selectedKey));
            }
        }
    };

    return (<div>
        <Accordion variant="splitted" className="px-0 w-full mx-auto"
                   selectedKeys={selectedTripIndex !== null ? new Set([selectedTripIndex.toString()]) : new Set([])}
                   onSelectionChange={handleSelectionChange}>
            {directions.trips.map((trip, index) => (
                <AccordionItem key={index} value={index.toString()} className="z-10 transition-colors"
                               title={<div className="flex flex-col gap-1">
                                   <Steps trip={trip} />
                                   <span className="font-bold text-2xl flex flex-row items-center gap-x-2">
                                           <span
                                               className={cn(`text-${getDelayColor(trip.legs[0]?.mode !== "WALK" ? trip.legs[0]?.realTime?.delay : trip.legs[1]?.realTime?.delay ?? null)}`)}>
                                               {format(new Date(trip.startTime), "HH:mm")}
                                           </span>
                                           <IconArrowRight className="shrink-0" />
                                           <span
                                               className={cn(`text-${getDelayColor(trip.legs[trip.legs.length - 1]?.mode !== "WALK" ? trip.legs[trip.legs.length - 1]?.realTime?.delay : trip.legs[trip.legs.length - 1].tripId !== trip.legs[trip.legs.length - 2].tripId ? trip.legs[trip.legs.length - 2]?.realTime?.delay : null)}`)}>
                                               {format(new Date(trip.endTime), "HH:mm")}
                                           </span>
                                        </span>
                               </div>}
                               subtitle={<div className="flex flex-col gap-1">
                                   {(() => {
                                       const firstLeg = trip.legs[0];
                                       const transfers = trip.legs.filter(leg => leg.mode !== "WALK").length - 1;
                                       const duration = formatDuration(trip.duration);

                                       if (trip.legs.length === 1 && firstLeg.mode === "WALK") return `circa ${duration} a piedi`;

                                       return `${duration} · ${transfers < 1 ? "nessun cambio" : transfers + " " + (transfers > 1 ? "cambi" : "cambio")}`;
                                   })()}
                               </div>}
                >
                    <div className="flex flex-col space-y-6 pb-2">
                        {trip.legs
                            .map((leg, index) => (<div key={index} className="flex flex-col gap-4">
                                <div className="flex flex-row justify-between">
                                    <div className="flex flex-row gap-2 items-center">
                                        <TransportIcon type={leg.mode} size={24} />
                                        <div className="flex flex-col justify-center">
                                            {leg.mode !== "WALK" ? (
                                                <div className="flex flex-row items-center gap-x-1 flex-wrap">
                                                        <span
                                                            className="sm:text-lg text-md font-bold w-fit rounded-small flex flex-row items-center gap-x-1 text-white"
                                                            style={{
                                                                backgroundColor: leg.routeColor ? `#${leg.routeColor}` : leg.mode === "BUS" ? "#016FEE" : "red",
                                                                padding: "0.1rem 0.5rem",
                                                                textAlign: leg.routeColor ? "center" : "left",
                                                                color: "white",
                                                            }}> {leg.routeShortName} {leg.tripShortName}
                                                        </span>
                                                    <span className="sm:text-lg text-md font-bold">
                                                            {leg.headsign}
                                                        </span>
                                                </div>) : (<span className="sm:text-lg text-md font-bold">
                                                        cammina fino a {leg.to.name.toLowerCase() !== "end" ? leg.to.name : "destinazione"}
                                                    </span>)}
                                            <span className="text-foreground-500 text-sm">
                                                    {getLegDescription(leg)}
                                                </span>
                                        </div>
                                    </div>
                                    {leg.mode !== "WALK" && leg.realTime.url && (<Button
                                        as={Link}
                                        href={leg.realTime.url}
                                        variant="bordered"
                                        isIconOnly
                                        startContent={<IconAccessPoint />}
                                        radius="full"
                                        className="border-gray-500 border-1 self-center"
                                        aria-label={`${leg.routeLongName || ""} ${leg.tripShortName || ""} in tempo reale`}
                                    />)}
                                    {leg.mode === "WALK" && (<Button
                                        as={Link}
                                        href={`https://maps.apple.com/?saddr=${leg.from.lat},${leg.from.lon}&daddr=${leg.to.lat},${leg.to.lon}&dirflg=w`}
                                        variant="bordered"
                                        isIconOnly
                                        startContent={<IconMap />}
                                        radius="full"
                                        className="border-gray-500 border-1 self-center"
                                        aria-label={`${leg.mode || ""} ${leg.routeShortName || ""} in tempo reale`}
                                    />)}
                                </div>
                                {leg.mode !== "WALK" && (
                                    <div className="pl-8 md:px-8 flex flex-col md:flex-row justify-between">
                                        <Timeline steps={[{
                                            content: (<div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.from.name}
                                                        </span>
                                                <div className="flex gap-1 items-center">
                                                            <span
                                                                className={`text-sm ${leg.realTime.delay === 0 ? "font-bold text-success" : leg.realTime.delay ? "line-through text-foreground-500" : "text-foreground-500"}`}
                                                            >
                                                                {format(new Date(leg.scheduledStartTime), "HH:mm")}
                                                            </span>
                                                    {leg.realTime && leg.realTime.delay !== 0 && leg.realTime.delay !== null && (
                                                        <span
                                                            className={`font-bold text-sm text-${getDelayColor(leg.realTime?.delay)}`}>
                                                                    {format(new Date(leg.scheduledStartTime).getTime() + (leg.realTime?.delay * 60 * 1000), "HH:mm")}
                                                                </span>)}
                                                </div>

                                                <Accordion>
                                                    <AccordionItem key={1} aria-label="fermate"
                                                                   className={cn("text-sm text-foreground-500", leg.intermediateStops?.length === 0 && "pointer-events-none")}
                                                                   classNames={{
                                                                       title: "text-sm text-foreground-500",
                                                                       trigger: "-mb-8 pt-4 -ml-2 w-auto",
                                                                       content: "mt-4 -mb-4 pl-2"
                                                                   }}
                                                                   title={leg.intermediateStops && `${leg.intermediateStops.length === 0 ? "nessuna" : leg.intermediateStops.length} 
                                                                           fermat${leg.intermediateStops.length <= 1 ? "a" : "e"}, ${formatDuration(Math.round(leg.duration / 60))}`}
                                                                   indicator={leg.intermediateStops?.length === 0 && <></>}>
                                                        <div>
                                                            {leg.intermediateStops && leg.intermediateStops.map((stop: IntermediateStop, index) => (
                                                                <ul key={index} className="list-disc">
                                                                    <li>{stop.name} ({format(new Date(stop.departure).getTime() + ((leg.realTime?.delay || 0) * 60 * 1000), "HH:mm")})</li>
                                                                </ul>))}
                                                        </div>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>)
                                        }, {
                                            content: (<div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.to.name}
                                                        </span>
                                                <div className="flex gap-1 items-center">
                                                            <span
                                                                className={`text-sm ${leg.realTime?.delay === 0 ? "font-bold text-success" : leg.realTime?.delay ? "line-through text-foreground-500" : "text-foreground-500"}`}
                                                            >
                                                                {format(new Date(leg.scheduledEndTime), "HH:mm")}
                                                            </span>
                                                    {leg.realTime && leg.realTime?.delay !== 0 && leg.realTime?.delay !== null && (
                                                        <span
                                                            className={`font-bold text-sm text-${getDelayColor(leg.realTime?.delay)}`}>
                                                                    {format(new Date(leg.scheduledEndTime).getTime() + (leg.realTime?.delay * 60 * 1000), "HH:mm")}
                                                                </span>)}
                                                </div>
                                            </div>)
                                        }]} active={1} />

                                        <div
                                            className={cn("flex flex-row md:flex-col md:justify-start justify-between gap-4 max-w-2xl", leg.realTime?.info?.length > 0 && "w-full")}>
                                            {leg.realTime && leg.realTime.info && leg.realTime.info.length > 0 && (
                                                <Accordion isCompact>
                                                    <AccordionItem key={1} title="Avvisi"
                                                                   classNames={{
                                                                       indicator: "text-foreground",
                                                                       title: "font-bold",
                                                                       trigger: "py-3",
                                                                       base: "mt-4"
                                                                   }}
                                                                   startContent={<IconAlertTriangle />}
                                                                   className="bg-warning-500/50 px-4 scrollbar-hide rounded-large max-h-64 overflow-scroll">
                                                        <div className="pb-2 text-small">
                                                            {leg && leg.realTime.info && leg.realTime.info.map((alert, index) => (
                                                                <div key={index}
                                                                     className="flex flex-col gap-2">
                                                                    {alert.url ? (<div className="flex flex-col">
                                                                        <Link href={alert.url} target="_blank">
                                                                            {alert.message}
                                                                            <IconExternalLink
                                                                                className="shrink-0 ml-1 mb-1 inline text-center"
                                                                                size={16} />
                                                                        </Link>
                                                                    </div>) : (<div className="flex flex-col">
                                                                        <span>{alert.message}</span>
                                                                    </div>)}
                                                                    {index !== leg.realTime.info!.length - 1 &&
                                                                        <Divider className="mb-2" />}
                                                                </div>))}
                                                        </div>
                                                    </AccordionItem>
                                                </Accordion>)}
                                        </div>
                                    </div>)}
                            </div>))}
                    </div>
                </AccordionItem>))}
        </Accordion>
    </div>);
}