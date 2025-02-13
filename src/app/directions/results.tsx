"use client"
import Timeline from "@/components/timeline";
import { Accordion, AccordionItem } from "@heroui/react";
import { IconBus, IconTrain, IconWalk } from "@tabler/icons-react";
import { format } from "date-fns";
import { Trip } from "./interfaces";
import Steps from "./steps";

export default function Results({ data }: { data: Trip }) {
    const IconMap: Record<string, React.ReactNode> = {
        "bus": <IconBus size={32} />,
        "rail": <IconTrain size={32} />,
        "foot": <IconWalk size={32} />,
    }

    return (
        <Accordion variant="splitted" className="px-0 w-full mx-auto">
            {data.tripPatterns.map((pattern, index) => (
                <AccordionItem key={index} value={`item-${index}`} title={
                    <div className="flex flex-col gap-1">
                        <Steps pattern={pattern} />
                        <span className="font-bold text-2xl">{format(new Date(pattern.aimedStartTime), "HH:mm")}</span>
                    </div>
                }
                    subtitle={
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">
                                {(() => {
                                    const transfers = pattern.legs
                                        .filter(leg => leg.mode !== "foot")
                                        .length - 1;
                                    const durationInMinutes = Math.round(pattern.duration / 60);
                                    const hours = Math.floor(durationInMinutes / 60);
                                    const minutes = durationInMinutes % 60;

                                    const durationStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

                                    return `${durationStr} · ${transfers < 1 ? "nessun" : transfers} cambi${transfers <= 1 ? "o" : ""}`;
                                })()}
                            </span>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-8">
                        {pattern.legs.map((leg, legIndex) => (
                            <div key={legIndex} className="flex flex-col gap-4">
                                <div className="flex flex-row gap-2 items-center">
                                    {IconMap[leg.mode]}
                                    <div className="flex flex-col justify-center">
                                        <span className="text-lg font-bold">
                                            {leg.mode === "foot" && `cammina fino a ${leg.toPlace.name !== "Destination" ? leg.toPlace.name : "destinazione"}`} {leg.line?.publicCode} {leg.serviceJourney?.publicCode}
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            {leg.mode === "rail" ? "Treno per " + leg.toEstimatedCall?.destinationDisplay?.frontText : leg.line?.name}
                                            {leg.mode === "foot" && `${Math.round(leg.duration / 60)}min · ${(() => {
                                                const distanceInKm = leg.distance / 1000;
                                                return distanceInKm > 1 ? `${distanceInKm.toFixed(1)}km` : `${Math.round(leg.distance)}m`;
                                            })()}`}
                                        </span>
                                    </div>
                                </div>
                                {leg.mode !== "foot" && (
                                    <div className="pl-10">
                                        <Timeline steps={[{
                                            content: (
                                                <div className="flex flex-col">
                                                    <span className="font-bold">
                                                        {leg.fromPlace.name}
                                                    </span>
                                                    <span className="text-gray-400 text-sm">
                                                        {format(new Date(leg.aimedStartTime), "HH:mm")}
                                                    </span>
                                                    {leg.intermediateQuays.length > 0 && (
                                                        <span className="text-gray-400 text-sm -mb-4 mt-3 leading-none">
                                                            {leg.intermediateQuays.length} fermate, {Math.round(leg.duration / 60)}min
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
                                                    <span className="text-gray-400 text-sm">
                                                        {format(new Date(leg.aimedEndTime), "HH:mm")}
                                                    </span>
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
