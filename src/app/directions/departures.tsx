import { type StationMonitor } from "@/api/types";
import stations from "@/stations.json";
import { capitalize } from "@/utils";
import { Card, Link } from "@heroui/react";
import { IconChevronRight } from "@tabler/icons-react";

export default function Departures({
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
        <Card className="flex flex-col gap-4 p-4">
            <Link
                href={`/departures/${id}`}
                className="flex items-center gap-2 text-xl font-bold"
            >
                <span>Prossime partenze da {departures.name}</span>
                <IconChevronRight className="w-5 h-5" />
            </Link>

            <div className="flex flex-col gap-4">
                {groupedAndSorted.map(([dest, trains]) => (
                    <div key={dest} className="flex items-start gap-4">
                        <div className="w-1/3 shrink-0 font-medium">per {capitalize(dest || "")}</div>
                        <div className={`grid gap-2 text-sm sm:grid-cols-2 grid-cols-1`}>
                            {trains.map((train, i) => (
                                <span key={i}>
                                    <strong>{train.shortCategory} {train.number}</strong> alle <strong>{train.departureTime}</strong>
                                    {train.platform !== "Piazzale Ferrovia" ? " al binario " + train.platform : " nel piazzale"}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}