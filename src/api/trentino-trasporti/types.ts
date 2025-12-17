import {Info} from "@/api/motis/types";

export interface Trip {
    id: string,
    currentStopIndex: number,
    lastKnownLocation: string | null,
    lastUpdate: string | null,
    status: string,
    category: string | null,
    route: string,
    vehicleId: string | null,
    origin: string,
    destination: string,
    departureTime: string,
    arrivalTime: string,
    delay: number,
    color: string,
    stops: Stop[],
    info: Info[],
}

export interface Stop {
    id: string;
    name: string;
    scheduledArrival: string;
    scheduledDeparture: string;
    lat: string;
    lon: string;
    status: "regular" | "not_planned" | "canceled";
}