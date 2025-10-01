import {IconBus, IconFerry, IconTrain, IconWalk} from "@tabler/icons-react";
import {ElementType} from "react";

interface TransportIconProps {
    type: string;
    size?: number;
}

const iconMap: Record<string, ElementType> = {
    BUS: IconBus,
    REGIONAL_FAST_RAIL: IconTrain,
    WALK: IconWalk,
    METRO: IconTrain,
    FERRY: IconFerry,
};

export function TransportIcon({type, size = 16}: TransportIconProps) {
    const IconComponent = iconMap[type];
    if (!IconComponent) {
        return <IconTrain size={size} className="shrink-0" />
    }
    return <IconComponent size={size} className="shrink-0" />
}