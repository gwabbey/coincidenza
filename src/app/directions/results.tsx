"use client";

import {Directions, IntermediateStop, Leg} from "@/api/motis/types";
import Timeline from "@/components/timeline";
import {formatDuration, getDelayColor} from "@/utils";
import {Accordion, AccordionItem, Button, cn, Divider, Link, Selection} from "@heroui/react";
import {
    IconAccessPoint,
    IconAlertTriangle,
    IconArrowRight,
    IconChevronsRight,
    IconExternalLink
} from "@tabler/icons-react";
import {format} from "date-fns";
import {TransportIcon} from "./icons";
import Steps from "./steps";
import {trainCategoryLongNames} from "@/train-categories";

function getMapUrl(from: { lat: number, lon: number }, to: { lat: number, lon: number }) {
    const origin = `${from.lat},${from.lon}`;
    const destination = `${to.lat},${to.lon}`;

    if (typeof window === "undefined") return "";

    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
    }

    return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=w`;
}

const getLegDescription = (leg: Leg) => {
    if (leg.mode === "WALK") {
        if (!leg.distance) return "";
        const roundedMeters = Math.round(leg.distance / 100) * 100;
        const distanceInKm = leg.distance / 1000;
        return roundedMeters > 999 ? `circa ${Number(distanceInKm.toFixed(1))} km` : `circa ${roundedMeters} metri`;
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

    return (<Accordion
        variant="splitted" className="px-0 w-full mx-auto"
        itemClasses={{base: "px-2"}}
        selectedKeys={selectedTripIndex !== null ? new Set([selectedTripIndex.toString()]) : new Set([])}
        onSelectionChange={handleSelectionChange}>
        {directions.trips.map((trip, index) => (
            <AccordionItem key={index} value={index.toString()} className="z-10 transition-colors"
                           classNames={{indicator: "text-foreground-500"}}
                           title={<div className="flex flex-col gap-1">
                               <Steps trip={trip} />
                               <span
                                   className="font-bold text-2xl flex flex-row items-center gap-x-2">
                                           <span
                                               className={cn(`text-${getDelayColor(trip.legs[0]?.mode !== "WALK" ? trip.legs[0]?.realTime?.delay : trip.legs[1]?.realTime?.delay ?? null)}`)}>
                                               {format(new Date(trip.startTime), "HH:mm")}
                                           </span>
                                           <IconArrowRight className="shrink-0" />
                                           <span
                                               className={cn(`text-${getDelayColor(trip.legs[trip.legs.length - 1]?.mode !== "WALK" ? trip.legs[trip.legs.length - 1]?.realTime?.delay : trip.legs[trip.legs.length - 1].tripId !== trip.legs[trip.legs.length - 2].tripId ? trip.legs[trip.legs.length - 2]?.realTime?.delay : null)}`)}>
                                               {format(new Date(trip.endTime), "HH:mm")} {new Date(trip.endTime).getDay() !== new Date().getDay() ?
                                               `(${new Date(trip.endTime).toLocaleString('it-IT', {weekday: 'short'})})` : ""}
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
                <div className="flex flex-col space-y-4 pb-4">
                    {trip.legs
                        .map((leg, index) => (<div key={index} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-row gap-2 items-center">
                                    <TransportIcon type={leg.mode} size={24} />
                                    <div className="flex flex-row justify-between w-full">
                                        <div className="flex flex-col justify-center">
                                            {leg.mode !== "WALK" ? (<div
                                                className="flex flex-row items-center gap-x-1 flex-wrap">
                                                <span
                                                    className="text-md font-bold w-fit rounded-small flex flex-row items-center gap-x-1 text-white"
                                                    style={{
                                                        backgroundColor: leg.realTime.status === "canceled" ? "gray" : leg.routeColor ? `#${leg.routeColor}` : leg.mode === "BUS" ? "#016FEE" : "red",
                                                        padding: "0.1rem 0.5rem",
                                                        textAlign: leg.routeColor ? "center" : "left",
                                                        color: "white",
                                                    }}> {leg.routeShortName} {leg.mode.includes("RAIL") && leg.tripShortName}
                                                        </span>
                                                <span
                                                    className="text-md font-bold">
                                                            {leg.headsign}
                                                        </span>
                                            </div>) : (<span className="text-md font-bold">
                                                        cammina per circa {formatDuration(Math.round(leg.duration / 60), true)}
                                                    </span>)}

                                            <span className="text-foreground-500 text-sm">
                                                    {leg.realTime.status === "canceled" ?
                                                        <strong>Cancellato</strong> : getLegDescription(leg)}
                                                </span>
                                        </div>

                                        {leg.mode === "WALK" && (<Button
                                            as={Link}
                                            isIconOnly
                                            target="_blank"
                                            href={getMapUrl(leg.from, leg.to)}
                                            variant="bordered"
                                            startContent={<IconChevronsRight />}
                                            radius="full"
                                            fullWidth
                                            className="border-gray-500 border-1 self-center text-medium"
                                            aria-label="indicazioni percorso a piedi"
                                        />)}

                                        {leg.mode !== "WALK" && leg.realTime.url && leg.realTime.status != "canceled" && (
                                            <Button
                                                as={Link}
                                                target="_blank"
                                                href={leg.realTime.url}
                                                variant="bordered"
                                                isIconOnly
                                                startContent={<IconAccessPoint />}
                                                radius="full"
                                                fullWidth
                                                className="border-gray-500 border-1 self-center text-medium"
                                                aria-label={`${leg.routeLongName || ""} ${leg.tripShortName || ""} in tempo reale`}
                                            />)}
                                    </div>
                                </div>
                            </div>

                            {leg.mode !== "WALK" && (
                                <div className="pl-8 flex flex-col xl:flex-row w-full justify-between gap-x-2">
                                    {leg.realTime.status !== "canceled" && (<div className="w-full xl:w-96 xl:min-w-96">
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
                                                    <AccordionItem key={1} aria-label="Fermate" isCompact
                                                                   className={cn("text-sm text-foreground-500 -ml-2 py-2 overflow-hidden", leg.intermediateStops?.length === 0 && "pointer-events-none")}
                                                                   classNames={{
                                                                       title: "text-sm text-foreground-500",
                                                                       trigger: "w-auto gap-2",
                                                                       content: "pl-4 pt-0 pb-2 overflow-hidden",
                                                                       indicator: "text-sm text-foreground-500"
                                                                   }}
                                                                   title={leg.intermediateStops && `${leg.intermediateStops.length === 0 ? "nessuna" : leg.intermediateStops.length} fermat${leg.intermediateStops.length <= 1 ? "a" : "e"}, ${formatDuration(Math.round(leg.duration / 60))}`}
                                                                   indicator={leg.intermediateStops?.length === 0 && <></>}>
                                                        <div className="space-y-1 overflow-hidden">
                                                            {leg.intermediateStops?.map((stop: IntermediateStop, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center gap-2 text-sm overflow-hidden"
                                                                >
                                                                    <span
                                                                        className="flex-1 truncate min-w-0">{stop.name}</span>
                                                                    <span
                                                                        className="tabular-nums text-foreground-500 shrink-0">
                                                                        {format(new Date(stop.departure).getTime() + ((leg.realTime?.delay || 0) * 60 * 1000), "HH:mm")}
                                                                    </span>
                                                                </div>))}
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
                                                    className={`text-sm ${leg.realTime?.delay === 0 ? "font-bold text-success" : leg.realTime?.delay ? "line-through text-foreground-500" : "text-foreground-500"}`}>
                                                    {format(new Date(leg.scheduledEndTime), "HH:mm")}
                                                </span>
                                                    {leg.realTime && leg.realTime?.delay !== 0 && leg.realTime?.delay !== null && (
                                                        <span
                                                            className={`font-bold text-sm text-${getDelayColor(leg.realTime?.delay)}`}>
                                                            {format(new Date(leg.scheduledEndTime).getTime() + (leg.realTime?.delay * 60 * 1000), "HH:mm")}
                                                        </span>)}
                                                </div>
                                            </div>)
                                        }]} active={-1} className="gap-0" />
                                    </div>)}

                                    {leg.realTime && leg.realTime.info && leg.realTime.info.length > 0 && (<div
                                        className={cn("flex flex-row xl:flex-col xl:justify-start justify-between gap-4 xl:mt-0 mt-4", leg.realTime?.info?.length > 0 && "max-w-80 w-full items-center")}>
                                        <Accordion isCompact
                                                   itemClasses={{base: "-mx-2"}}
                                                   hideIndicator={leg.realTime.status === "canceled"}
                                                   defaultExpandedKeys={leg.realTime.status === "canceled" ? ["1"] : []}>
                                            <AccordionItem key={1} title="Avvisi"
                                                           classNames={{
                                                               indicator: "text-foreground",
                                                               title: "font-bold",
                                                               trigger: "py-3"
                                                           }}
                                                           startContent={<IconAlertTriangle />}
                                                           className={cn("bg-warning-500/50 px-4 scrollbar-hide rounded-large max-h-64 overflow-scroll", leg.realTime.status === "canceled" && "pointer-events-none max-h-full")}>
                                                <div className="pb-2 text-small">
                                                    {leg && leg.realTime.info && leg.realTime.info.map((alert, index) => (
                                                        <div key={index}
                                                             className="flex flex-col gap-2">
                                                            {alert.url ? (<div className="flex flex-col">
                                                                <Link href={alert.url} isExternal
                                                                      color="foreground"
                                                                      className="inline text-small">
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
                                        </Accordion>
                                    </div>)}
                                </div>)}
                            {index < trip.legs.length - 1 && <Divider className="my-2" />}
                        </div>))}
                </div>
            </AccordionItem>))}
    </Accordion>);
}