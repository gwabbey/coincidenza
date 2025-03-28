import { Trip } from "@/api/otp/types";
import { IconBus, IconChevronRight, IconTrain, IconWalk } from "@tabler/icons-react";

export default function Steps({ trip }: { trip: Trip }) {
    const IconMap: Record<string, React.ReactNode> = {
        "bus": <IconBus size={16} />,
        "rail": <IconTrain size={16} />,
        "foot": <IconWalk size={16} />,
        "metro": <IconTrain size={16} />,
    }

    return (
        <div>
            <div className="flex flex-row gap-1 text-sm flex-wrap">
                {trip.legs.filter(leg => leg.mode !== "foot").map((leg, index) => (
                    <div key={index} className="flex flex-row gap-1 items-center">
                        {IconMap[leg.mode]} {leg.line?.category} {leg.code}
                        {index < trip.legs.filter(leg => leg.mode !== "foot").length - 1 && <IconChevronRight size={16} className="self-center" />}
                    </div>
                ))}
            </div>
        </div>
    );
}