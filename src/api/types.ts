import {Info} from "@/api/motis/types";

export interface Trip {
    currentStopIndex: number,
    lastKnownLocation: string | null,
    lastUpdate: string | null,
    status: "scheduled" | "active" | "completed" | "canceled",
    category: string | null,
    number: string,
    origin: string,
    destination: string,
    departureTime: string,
    arrivalTime: string,
    delay: number,
    alertMessage: string | null,
    stops: Stop[],
    info: Info[],
    clientId: number,
    company: string,
    originId?: string;
    timestamp?: number;
    color: string,
}

export interface Stop {
    id: string;
    name: string;
    scheduledArrival: string;
    scheduledDeparture: string;
    actualArrival: string | null;
    actualDeparture: string | null;
    arrivalDelay: number | null;
    departureDelay: number | null;
    scheduledPlatform: string | null;
    actualPlatform: string | null;
    status: "regular" | "not_planned" | "canceled";
}

export interface Train {
    company: string | null;
    category: string | null;
    shortCategory: string | null;
    number: string;
    destination: string;
    departureTime: string;
    delay: string;
    platform: string;
    departing: boolean;
    stops: {
        name: string;
        time: string;
    }[];
    alerts: string;
}

export interface Bus {
    id: string;
    company: string;
    route: string | null;
    color: string | null;
    vehicleId: string | null;
    destination: string;
    departureTime: string;
    delay: number;
    stopsAway: number | null;
    started: boolean;
    departing: boolean;
}

export interface StationMonitor {
    name: string;
    trains: Train[];
    alerts: string;
}