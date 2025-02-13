import { IconBus, IconChevronRight, IconTrain, IconWalk } from "@tabler/icons-react";
import { TripPattern } from "./interfaces";

export default function Steps({ pattern }: { pattern: TripPattern }) {
    const IconMap: Record<string, React.ReactNode> = {
        "bus": <IconBus size={16} />,
        "rail": <IconTrain size={16} />,
        "foot": <IconWalk size={16} />,
    }
    return (
        <div>
            <div className="flex flex-row gap-1 text-sm text-gray-400 flex-wrap">
                {pattern.legs.map((leg, index) => (
                    <div key={index} className="flex flex-row gap-1 items-center">
                        {IconMap[leg.mode]} {leg.line?.publicCode} {leg.serviceJourney?.publicCode}
                        {index < pattern.legs.length - 1 && <IconChevronRight size={16} className="self-center" />}
                    </div>
                ))}
            </div>
        </div>
    );
}