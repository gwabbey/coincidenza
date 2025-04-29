import { StationMonitor } from "@/api/types";
import { Card } from "@heroui/react";

export default function Departures({ departures }: { departures: StationMonitor }) {
    return (
        <Card className="flex flex-col gap-2">
            {departures.trains
                .map((leg, index) => (
                    <div key={index} className="flex flex-row gap-1 items-center">
                        {leg.number}
                    </div>
                ))}
        </Card>
    );
}