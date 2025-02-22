"use client"
import Timeline from "@/components/timeline";
import { Accordion, AccordionItem, Alert, Button, Link, Card, cn, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import { IconAccessPoint, IconBus, IconExclamationCircle, IconInfoCircleFilled, IconInfoSmall, IconInfoTriangle, IconInfoTriangleFilled, IconTrain, IconWalk } from "@tabler/icons-react";
import { format } from "date-fns";
import { Directions } from "./types";
import Steps from "./steps";
import { formatDuration, getDelayColor } from "@/utils";

export default function Results({ directions }: { directions: Directions }) {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const IconMap: Record<string, React.ReactNode> = {
        "bus": <IconBus size={32} />,
        "rail": <IconTrain size={32} />,
        "foot": <IconWalk size={32} />,
    }

    const getLegDescription = (leg: any) => {
        if (leg.mode === "rail" && leg.destination) {
            return `Treno per ${leg.destination}`;
        }
        if (leg.mode === "foot") {
            const distanceInKm = leg.distance / 1000;
            const distanceStr = distanceInKm > 1 ? `${distanceInKm.toFixed(1)} km` : `${Math.round(leg.distance)} metri`;
            return `${formatDuration(leg.duration)} · ${distanceStr}`;
        }
        return leg.line?.name || "";
    };

    return (
        <Accordion variant="splitted" className="px-0 w-full mx-auto">
            {directions.trips.map((trip, index) => (
                <AccordionItem key={index} value={`item-${index}`} title={
                    <div className="flex flex-col gap-1">
                        <Steps trip={trip} />
                        <span className="font-bold text-2xl">{format(new Date(trip.aimedStartTime), "HH:mm")}</span>
                    </div>
                }
                    subtitle={
                        <div className="flex flex-col gap-1">
                            {(() => {
                                const transfers = trip.legs
                                    .filter(leg => leg.mode !== "foot")
                                    .length - 1;
                                const duration = formatDuration(trip.duration);

                                return `${duration} · ${transfers < 1 ? "diretto" : transfers + " " + (transfers > 1 ? "cambi" : "cambio")}`;
                            })()}
                        </div>
                    }
                >
                    <div className="flex flex-col space-y-8 pb-4">
                        {trip.legs
                            .filter(leg => leg.distance >= 50)
                            .map((leg, legIndex) => (
                                <div key={legIndex} className="flex flex-col gap-4">
                                    <div className="flex flex-row justify-between">
                                        <div className="flex flex-row gap-2 items-center">
                                            {IconMap[leg.mode]}
                                            <div className="flex flex-col justify-center">
                                                {leg.mode !== "foot" ? (
                                                    <div className="flex flex-row items-center gap-x-1">
                                                        <span className="sm:text-lg text-md font-bold w-fit rounded-small" style={{
                                                            backgroundColor: (leg.line?.color && leg.mode === "bus") ? `#${leg.line.color}` : "transparent",
                                                            padding: (leg.line?.color && leg.mode === "bus") ? "0.1rem 0.5rem" : "0",
                                                            textAlign: (leg.line?.color && leg.mode === "bus") ? "center" : "left",
                                                            color: (leg.line?.color && leg.mode === "bus") ? "white" : "inherit",
                                                        }}>
                                                            {leg.line?.code}
                                                        </span>
                                                        <span className="sm:text-lg text-md font-bold">
                                                            {leg.code} {leg.realtime?.destination}
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
                                        {leg.mode !== "foot" && (
                                            <Button
                                                as={Link}
                                                href={`/track/trentino-trasporti/${leg.tripId}`}
                                                variant="bordered"
                                                isIconOnly
                                                isExternal
                                                radius="full"
                                                className="border-gray-500 border-1 self-center"
                                                aria-label={`${leg.line?.code || ""} ${leg.code || ""} in tempo reale`}
                                            >
                                                <IconAccessPoint />
                                            </Button>
                                        )}
                                    </div>
                                    {leg.mode !== "foot" && (
                                        <div className="pl-10 flex flex-col gap-4">
                                            {leg.realtime?.alerts.length > 0 && (
                                                <Button variant="flat" color="warning" className="flex items-center font-bold sm:w-fit" startContent={<IconInfoTriangleFilled />}
                                                    onPress={onOpen}>
                                                    avvisi
                                                </Button>
                                            )}
                                            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
                                                <ModalContent className="pb-2">
                                                    <ModalHeader className="flex flex-col gap-1">avvisi sulla linea</ModalHeader>
                                                    <ModalBody>
                                                        {leg.realtime?.alerts.map((alert, index) => (
                                                            <div key={index} className="flex flex-col gap-2">
                                                                <Link isExternal showAnchorIcon href={alert.url}>
                                                                    {alert.description}
                                                                </Link>
                                                            </div>
                                                        ))}
                                                    </ModalBody>
                                                </ModalContent>
                                            </Modal>

                                            <Timeline steps={[{
                                                content: (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.fromPlace.name}
                                                        </span>
                                                        <div className="flex gap-1 items-center">
                                                            <span className={`text-gray-500 text-sm ${leg.realtime?.delay ? (leg.realtime?.delay != 0 ? "line-through" : "font-bold text-success") : ""}`}>
                                                                {format(new Date(leg.aimedStartTime), "HH:mm")}
                                                            </span>
                                                            {leg.realtime && leg.realtime?.delay !== 0 && leg.realtime?.delay !== null && (
                                                                <span className={`font-bold text-sm text-${getDelayColor(leg.realtime?.delay)}`}>
                                                                    {format(new Date(leg.aimedStartTime).getTime() + (leg.realtime?.delay * 60 * 1000), "HH:mm")}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {leg.intermediateQuays.length > 0 && (
                                                            <span className="text-gray-500 text-sm -mb-4 mt-3 leading-none">
                                                                {leg.intermediateQuays.length} fermat{leg.intermediateQuays.length === 1 ? "a" : "e"}, {formatDuration(leg.duration)}
                                                            </span>
                                                        )}
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
                                                            <span className={`text-gray-500 text-sm ${leg.realtime?.delay ? (leg.realtime?.delay != 0 ? "line-through" : "font-bold text-success") : ""}`}>
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
                </AccordionItem>
            ))}
        </Accordion>
    );
}
