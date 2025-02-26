"use client"
import Timeline from "@/components/timeline";
import { Accordion, AccordionItem, Alert, Button, Link, Card, cn, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import { IconAccessPoint, IconBus, IconMap, IconInfoTriangleFilled, IconTrain, IconWalk } from "@tabler/icons-react";
import { format } from "date-fns";
import { Directions } from "./types";
import Steps from "./steps";
import { formatDuration, getDelayColor } from "@/utils";
import LeafletMap from "@/components/leaflet";
import { useState } from "react";

type RouteModalProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    title: string;
    children: React.ReactNode;
};

const RouteModal = ({ isOpen, onOpenChange, title, children }: RouteModalProps) => (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent className="pb-2">
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
        </ModalContent>
    </Modal>
);

export default function Results({ directions }: { directions: Directions }) {
    const infoModal = useDisclosure();
    const mapModal = useDisclosure();
    const [selectedLeg, setSelectedLeg] = useState<any>(null);

    const icons: Record<string, React.ReactNode> = {
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
            const roundedMeters = Math.round(leg.distance / 100) * 100;
            const distanceStr = distanceInKm > 1 ? `${distanceInKm.toFixed(1)} km` : `circa ${roundedMeters} metri`;
            return `${formatDuration(leg.duration)} · ${distanceStr}`;
        }
        return leg.line?.name || "";
    };

    const openModal = (leg: any, modalType: 'map' | 'info') => {
        setSelectedLeg(leg);
        if (modalType === 'map') {
            mapModal.onOpen();
        } else {
            infoModal.onOpen();
        }
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
                                            {icons[leg.mode]}
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
                                                startContent={<IconAccessPoint />}
                                                radius="full"
                                                className="border-gray-500 border-1 self-center"
                                                aria-label={`${leg.line?.code || ""} ${leg.code || ""} in tempo reale`}
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
                                                aria-label={`${leg.line?.code || ""} ${leg.code || ""} in tempo reale`}
                                            />
                                        )}
                                    </div>
                                    {leg.mode !== "foot" && (
                                        <div className="pl-10 flex flex-col gap-4">
                                            {leg.realtime.alerts && leg.realtime.alerts.length > 0 && (
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

                                            <LeafletMap leg={leg} className="hidden sm:flex" />

                                            <Button
                                                variant="flat"
                                                color="primary"
                                                className="flex items-center font-bold sm:hidden"
                                                startContent={<IconMap />}
                                                onPress={() => openModal(leg, 'map')}
                                            >
                                                vedi sulla mappa
                                            </Button>

                                            <Timeline steps={[{
                                                content: (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">
                                                            {leg.fromPlace.name}
                                                        </span>
                                                        <div className="flex gap-1 items-center">
                                                            <span
                                                                className={cn(
                                                                    "text-sm",
                                                                    leg.realtime.delay === null
                                                                        ? "text-gray-500"
                                                                        : leg.realtime.delay === 0
                                                                            ? "font-bold text-success"
                                                                            : "text-gray-500 line-through"
                                                                )}
                                                            >
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
                                                            <span
                                                                className={cn(
                                                                    "text-sm",
                                                                    leg.realtime.delay === null
                                                                        ? "text-gray-500"
                                                                        : leg.realtime.delay === 0
                                                                            ? "font-bold text-success"
                                                                            : "text-gray-500 line-through"
                                                                )}
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
                        title={selectedLeg ? `percorso ${selectedLeg.line?.code} ${selectedLeg.realtime?.destination}` : 'percorso'}
                    >
                        {selectedLeg && <LeafletMap leg={selectedLeg} />}
                    </RouteModal>

                    <RouteModal
                        isOpen={infoModal.isOpen}
                        onOpenChange={infoModal.onOpenChange}
                        title="avvisi sulla linea"
                    >
                        {selectedLeg && selectedLeg.realtime?.alerts && selectedLeg.realtime.alerts.map((alert: any, index: number) => (
                            <div key={index} className="flex flex-col gap-2">
                                <Link isExternal showAnchorIcon href={alert.url}>
                                    {alert.description}
                                </Link>
                            </div>
                        ))}
                    </RouteModal>
                </AccordionItem>
            ))}
        </Accordion>
    );
}