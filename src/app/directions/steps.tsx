import { Trip } from "@/api/motis/types";
import { IconChevronRight } from "@tabler/icons-react";
import { TransportIcon } from "./icons";

export default function Steps({ trip }: { trip: Trip }) {
    const legs = trip.legs;

    if (legs.every((leg) => leg.mode === "foot")) {
        return (
            <div className="flex flex-row gap-1 items-center text-sm">
                <TransportIcon type="WALK" size={16} />
                <span>A piedi</span>
            </div>
        );
    }

    return (
        <div className="flex flex-row gap-1 text-sm flex-wrap">
            {legs
                .filter((leg) => leg.mode !== "foot")
                .map((leg, index, filteredLegs) => (
                    <div
                        key={index}
                        className="flex flex-row gap-1 items-center"
                    >
                        <TransportIcon
                            type={leg.mode}
                            size={16}
                        />
                        {leg.routeShortName} {leg.tripShortName}
                        {index < filteredLegs.length - 1 && (
                            <IconChevronRight size={16} className="self-center" />
                        )}
                    </div>
                ))}
        </div>
    );
}