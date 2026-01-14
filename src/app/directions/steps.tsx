import {Trip} from "@/api/motis/types";
import {IconChevronRight} from "@tabler/icons-react";
import {TransportIcon} from "./icons";
import {cn} from "@heroui/react";

export default function Steps({trip}: { trip: Trip }) {
    const legs = trip.legs;

    if (legs.every((leg) => leg.mode === "foot")) {
        return (<div className="flex flex-row gap-1 items-center text-sm">
            <TransportIcon type="WALK" size={16} />
            <span>A piedi</span>
        </div>);
    }

    return (<div className="flex flex-row gap-1 text-sm flex-wrap">
        {legs
            .filter((leg) => leg.mode !== "foot")
            .map((leg, index, filteredLegs) => (<div
                key={index}
                className={cn("flex flex-row gap-1 items-center", leg.realTime.status === "canceled" && "line-through")}
            >
                {leg.mode === "WALK" && <TransportIcon
                    type={leg.mode}
                    size={16}
                />}
                {leg.routeShortName && (<span
                    className="font-semibold w-fit rounded-small flex flex-row items-center gap-x-1 text-white"
                    style={{
                        backgroundColor: leg.realTime.status === "canceled" ? "gray" : leg.routeColor ? `#${leg.routeColor}` : leg.mode === "BUS" ? "#016FEE" : "red",
                        padding: "0.1rem 0.5rem",
                    }}> {leg.routeShortName} {leg.mode.includes("RAIL") && leg.tripShortName}
                </span>)}
                {index < filteredLegs.length - 1 && (<IconChevronRight size={16} className="self-center" />)}
            </div>))}
    </div>);
}