"use client"
import {type StationMonitor} from "@/api/types";
import stations from "@/stations.json";
import {capitalize, getDelayColor} from "@/utils";
import {Card, cn, Divider} from "@heroui/react";
import {format} from "date-fns";
import {Link as NextLink} from "next-view-transitions";

export default function DeparturesCard({
                                           departures,
                                       }: {
    departures: StationMonitor;
}) {
    const stationEntry = Object.entries(stations).find(
        ([, name]) => name === departures.name
    );
    const id = stationEntry?.[0] ?? "-";

    const groupedAndSorted = Object.entries(
        departures.trains.reduce((acc, train) => {
            const dest = train.destination;
            if (!acc[dest]) acc[dest] = [];
            acc[dest].push(train);
            return acc;
        }, {} as Record<string, typeof departures.trains>)
    ).sort((a, b) => b[1].length - a[1].length);

    return (
        <NextLink href={`/departures/${id}`} className="w-full max-w-4xl cursor-pointer rounded-large">
            <Card className="flex flex-col gap-4 p-4 w-full">
                <div className="text-2xl font-bold text-center mx-auto">
                    Prossime partenze da {departures.name}
                </div>

                <div className="flex flex-col gap-4">
                    {groupedAndSorted.map(([dest, trains]) => (
                        <div key={dest} className="flex flex-col gap-2 items-stretch justify-stretch w-full">
                            <div className="font-bold text-lg">{capitalize(dest)}</div>
                            <div>
                                {trains.map((train, i) => {
                                    return (
                                        <div key={i} className="grid grid-cols-3 gap-4 w-full">
                                            <div>{train.shortCategory} {train.number}</div>
                                            <div className="flex justify-center gap-1">
                                            <span
                                                className={cn(Number(train.delay === "0") ? "text-success font-bold" : "text-foreground-500 line-through")}>
                                                {format(new Date(`1970-01-01T${train.departureTime}:00`), "HH:mm")}
                                            </span>
                                                {train.delay !== "0" &&
                                                    <span
                                                        className={cn(`text-${getDelayColor(Number(train.delay))}`, "font-bold")}>
                                                    {format(new Date(`1970-01-01T${train.departureTime}:00`).getTime() + Number(train.delay) * 60000, "HH:mm")}
                                                </span>}
                                            </div>
                                            {train.platform !== "." && (
                                                <div
                                                    className={train.delay === "CANCELLATO" ? "text-danger font-bold" : ""}>
                                                    {train.delay === "CANCELLATO" ? "cancellato"
                                                        : train.platform !== "Piazzale Esterno"
                                                            ? `binario ${train.platform}`
                                                            : "nel piazzale"}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <Divider className="mt-2" />
                        </div>
                    ))}
                </div>
            </Card>
        </NextLink>
    );
}