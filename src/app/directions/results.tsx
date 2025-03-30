"use client";

import { agencies } from "@/agencies";
import { Directions, Leg } from "@/api/otp/types";
import LeafletMap from "@/components/leaflet";
import { RouteModal } from "@/components/modal";
import Timeline from "@/components/timeline";
import { trainCodeLogos } from "@/train-categories";
import { formatDuration, getDelayColor } from "@/utils";
import { Accordion, AccordionItem, Button, Image, Link, Selection, useDisclosure } from "@heroui/react";
import { IconAccessPoint, IconBus, IconChevronDown, IconInfoTriangleFilled, IconMap, IconTrain, IconWalk } from "@tabler/icons-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Steps from "./steps";

export default function Results({ directions }: { directions: Directions }) {
    console.log(directions);
    const infoModal = useDisclosure();
    const mapModal = useDisclosure();
    const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));

    const icons: Record<string, React.ReactNode> = {
        "bus": <IconBus size={32} />,
        "rail": <IconTrain size={32} />,
        "foot": <IconWalk size={32} />,
        "metro": <IconTrain size={32} />,
    }

    const getLegDescription = (leg: Leg) => {
        if (leg.mode === "foot") {
            const distanceInKm = leg.distance / 1000;
            const roundedMeters = Math.round(leg.distance / 100) * 100;
            const distanceStr = distanceInKm > 1 ? `circa ${distanceInKm.toFixed(0)} km` : `circa ${roundedMeters} metri`;
            return `${formatDuration(Math.round(leg.duration / 60))} · ${distanceStr}`;
        }
        return leg.line?.name || "";
    };

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

    return (
        <Accordion variant="splitted" className="px-0 w-full mx-auto" selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys}>
            {directions.trips.map((trip, index) => (
                <AccordionItem key={index} value={`item-${index}`}
                    title={
                        <div className="flex flex-col gap-1">
                            <Steps trip={trip} />
                            <span className="font-bold text-2xl">{format(new Date(trip.legs.length > 1 ? trip.legs[1].aimedStartTime : trip.aimedStartTime), "HH:mm")}</span>
                        </div>
                    }
                    subtitle={
                        <div className="flex flex-col gap-1">
                            {(() => {
                                const transfers = trip.legs
                                    .filter(leg => leg.mode !== "foot")
                                    .length - 1;
                                const duration = formatDuration(Math.round(trip.duration / 60));

                                return `${duration} · ${transfers < 1 ? "diretto" : transfers + " " + (transfers > 1 ? "cambi" : "cambio")}`;
                            })()}
                        </div>
                    }
                >
                    <div className="flex flex-col space-y-8 pb-4">
                        {trip.legs
                            .filter(leg => leg.distance >= 50)
                            .map((leg, index) => (
                                <div key={index} className="flex flex-col gap-4">
                                    <div className="flex flex-row justify-between">
                                        <div className="flex flex-row gap-2 items-center">
                                            {icons[leg.mode]}
                                            <div className="flex flex-col justify-center">
                                                {leg.mode !== "foot" ? (
                                                    <div className="flex flex-row items-center gap-x-1">
                                                        <span className="sm:text-lg text-md font-bold w-fit rounded-small flex flex-row items-center gap-x-1 text-white" style={{
                                                            backgroundColor: leg.line?.color ? `#${leg.line.color}` : "transparent",
                                                            padding: leg.line?.color ? "0.1rem 0.5rem" : "0",
                                                            textAlign: leg.line?.color ? "center" : "left",
                                                            color: leg.line?.color ? "white" : "inherit",
                                                        }}>
                                                            {trainCodeLogos.find(code => code.code === leg.line?.category)?.url ? (
                                                                <Image
                                                                    src={trainCodeLogos.find(code => code.code === leg.line?.category)?.url ?? ""}
                                                                    alt={leg.code || ""}
                                                                    radius="none"
                                                                    className="flex h-4 self-center w-auto max-w-full invert"
                                                                />
                                                            ) : (
                                                                leg.line?.category
                                                            )} {leg.code}
                                                        </span>
                                                        <span className="sm:text-lg text-md font-bold">
                                                            {leg.realtime?.destination || leg.destination}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="sm:text-lg text-md font-bold">
                                                        cammina fino a {leg.toPlace.name !== "Destination" ? leg.toPlace.name : "destinazione"}
                                                    </span>
                                                )}
                                                <span className="text-gray-500 text-sm">
                                                    {getLegDescription(leg)}
                                                </span>
                                            </div>
                                        </div>
                                        {leg.mode !== "foot" && leg.realtime?.status === "tracked" && (
                                            <Button
                                                as={Link}
                                                href={`/track/${agencies[leg.authority?.id as keyof typeof agencies]}/${leg.tripId || leg.code}`}
                                                variant="bordered"
                                                isIconOnly
                                                isExternal
                                                startContent={<IconAccessPoint />}
                                                radius="full"
                                                className="border-gray-500 border-1 self-center"
                                                aria-label={`${leg.line?.category || ""} ${leg.code || ""} in tempo reale`}
                                            />
                                        )}
                                        {leg.mode === "foot" && (
                                            <Button
                                                as={Link}
                                                href={`https://maps.apple.com/?saddr=${leg.fromPlace.latitude},${leg.fromPlace.longitude}&daddr=${leg.toPlace.latitude},${leg.toPlace.longitude}&dirflg=w`}
                                                variant="bordered"
                                                isIconOnly
                                                isExternal
                                                startContent={<IconMap />}
                                                radius="full"
                                                className="border-gray-500 border-1 self-center"
                                                aria-label={`${leg.line?.category || ""} ${leg.code || ""} in tempo reale`}
                                            />
                                        )}
                                    </div>
                                    {leg.mode !== "foot" && (
                                        <div className="pl-10 flex flex-col gap-4">
                                            {leg.realtime?.info && leg.realtime?.info.length > 0 && (
                                                <Button
                                                    variant="flat"
                                                    color="warning"
                                                    className="flex items-center font-bold sm:w-fit"
                                                    startContent={<IconInfoTriangleFilled />}
                                                    onPress={() => openModal(leg, 'info')}
                                                >
                                                    avvisi
                                                </Button>
                                            )}

                                            <LeafletMap leg={leg} className="hidden sm:flex rounded-small" />

                                            <Button
                                                variant="flat"
                                                color="primary"
                                                className="flex items-center font-bold sm:hidden"
                                                startContent={<IconMap />}
                                                onPress={() => openModal(leg, 'map')}
                                            >
                                                vedi sulla mappa
                                            </Button>

                                            {leg.realtime && leg.realtime?.delay !== null && (
                                                <span className="flex flex-row items-center gap-x-1">
                                                    <div className="relative inline-flex">
                                                        <div className="rounded-full bg-green-400 h-[8px] w-[8px] inline-block mr-1"></div>
                                                        <div className="absolute animate-ping rounded-full bg-green-400 h-[8px] w-[8px] mr-1"></div>
                                                    </div>
                                                    <span className={`font-bold text-sm text-${getDelayColor(leg.realtime?.delay)}`}>
                                                        {leg.realtime?.delay !== 0 && formatDuration(leg.realtime?.delay, true)} in {leg.realtime?.delay > 0 ? "ritardo" : leg.realtime?.delay < 0 ? "anticipo" : "orario"}
                                                    </span>
                                                </span>
                                            )}

                                            <Timeline steps={[{
                                                content: (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.fromPlace.name}
                                                        </span>
                                                        <div className="flex gap-1 items-center">
                                                            <span
                                                                className={`text-sm ${leg.realtime?.delay === 0
                                                                    ? "font-bold text-success"
                                                                    : leg.realtime?.delay
                                                                        ? "line-through text-gray-500"
                                                                        : "text-gray-500"
                                                                    }`}
                                                            >
                                                                {format(new Date(leg.aimedStartTime), "HH:mm")}
                                                            </span>
                                                            {leg.realtime && leg.realtime?.delay !== 0 && leg.realtime?.delay !== null && (
                                                                <span className={`font-bold text-sm text-${getDelayColor(leg.realtime?.delay)}`}>
                                                                    {format(new Date(leg.aimedStartTime).getTime() + (leg.realtime?.delay * 60 * 1000), "HH:mm")}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div
                                                            className={`flex items-center justify-start -mb-4 mt-2 ${leg.intermediateQuays.length > 0 ? "cursor-pointer" : ""}`}
                                                            onClick={() => {
                                                                const newSelectedKeys = new Set(selectedKeys);
                                                                const currentKey = `item-${index}-leg-stops`;
                                                                if (Array.from(selectedKeys).includes(currentKey)) {
                                                                    newSelectedKeys.delete(currentKey);
                                                                } else {
                                                                    newSelectedKeys.add(currentKey);
                                                                }
                                                                leg.intermediateQuays.length > 0 && setSelectedKeys(newSelectedKeys);
                                                            }}
                                                        >
                                                            <span className="text-gray-500 text-sm leading-none">
                                                                {leg.intermediateQuays.length === 0 ? "nessuna" : leg.intermediateQuays.length} fermat{leg.intermediateQuays.length <= 1 ? "a" : "e"}, {formatDuration(Math.round(leg.duration / 60))}
                                                            </span>
                                                            {leg.intermediateQuays.length > 0 && (
                                                                <motion.div
                                                                    animate={{ rotate: Array.from(selectedKeys).includes(`item-${index}-leg-stops`) ? 180 : 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="ml-1"
                                                                >
                                                                    <IconChevronDown size={16} className="text-gray-500" />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{
                                                                height: Array.from(selectedKeys).includes(`item-${index}-leg-stops`) ? "auto" : 0,
                                                                opacity: Array.from(selectedKeys).includes(`item-${index}-leg-stops`) ? 1 : 0
                                                            }}
                                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                                        >
                                                            <div className="text-sm text-gray-500 mt-6 -mb-4">
                                                                {leg.intermediateQuays.map((quay: any) => (
                                                                    <ul key={quay.id} className="list-disc ml-4">
                                                                        <li>{quay.name} ({format(new Date(quay.expectedDepartureTime).getTime() + ((leg.realtime?.delay || 0) * 60 * 1000), "HH:mm")})</li>
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
                                                            {leg.toPlace.name}
                                                        </span>
                                                        <div className="flex gap-1 items-center">
                                                            <span
                                                                className={`text-sm ${leg.realtime?.delay === 0
                                                                    ? "font-bold text-success"
                                                                    : leg.realtime?.delay
                                                                        ? "line-through text-gray-500"
                                                                        : "text-gray-500"
                                                                    }`}
                                                            >
                                                                {format(new Date(leg.aimedEndTime), "HH:mm")}
                                                            </span>
                                                            {leg.realtime && leg.realtime?.delay !== 0 && leg.realtime?.delay !== null && (
                                                                <span className={`font-bold text-sm text-${getDelayColor(leg.realtime?.delay)}`}>
                                                                    {format(new Date(leg.aimedEndTime).getTime() + (leg.realtime?.delay * 60 * 1000), "HH:mm")}
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
                        title={selectedLeg ? `percorso ${selectedLeg.line?.category || ''} ${selectedLeg.realtime?.destination || ''}` : 'percorso'}
                    >
                        {selectedLeg && <LeafletMap leg={selectedLeg} className="rounded-small" />}
                    </RouteModal>

                    <RouteModal
                        isOpen={infoModal.isOpen}
                        onOpenChange={infoModal.onOpenChange}
                        title="avvisi sulla linea"
                    >
                        {selectedLeg && selectedLeg.realtime?.info && selectedLeg.realtime?.info.map((alert: any, index: number) => (
                            <div key={index} className="flex flex-col gap-2">
                                {alert.url ? (
                                    <Link isExternal showAnchorIcon href={alert.url}>
                                        {alert.message}
                                    </Link>
                                ) : (
                                    <span>
                                        {alert.message}
                                    </span>
                                )}
                            </div>
                        ))}
                    </RouteModal>
                </AccordionItem>
            ))
            }
        </Accordion >
    );
}