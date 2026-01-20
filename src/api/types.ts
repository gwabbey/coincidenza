import {Info} from "@/api/motis/types";

export interface TrainTrip {
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
    stops: TrainStop[],
    info: Info[],
    clientId: number,
    company: string,
    originId?: string;
    timestamp?: number;
    color: string,
}

export interface TrainStop {
    id: string;
    name: string;
    scheduledArrival: string | null;
    scheduledDeparture: string | null;
    actualArrival: string | null;
    actualDeparture: string | null;
    arrivalDelay: number | null;
    departureDelay: number | null;
    scheduledPlatform: string | null;
    actualPlatform: string | null;
    status: "regular" | "not_planned" | "canceled";
}

export interface BusTrip {
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
    delay: number | null,
    color: string,
    company: string,
    stops: BusStop[],
    info: Info[],
}

export interface BusStop {
    id: string;
    name: string;
    scheduledArrival: string;
    scheduledDeparture: string;
    lat: string;
    lon: string;
    status: "regular" | "not_planned" | "canceled";
}

export interface TrainDeparture {
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

export interface BusDeparture {
    id: string;
    company: string;
    route: string | null;
    color: string | null;
    destination: string;
    departureTime: string;
    delay: number;
    tracked: boolean;
    departing: boolean;
}

export interface StationMonitor {
    name: string;
    trains: TrainDeparture[];
    alerts: string;
}