export interface Trip {
    currentStopIndex: number,
    lastKnownLocation: string | null,
    lastUpdate: Date | null,
    status: "scheduled" | "active" | "completed" | "canceled",
    category: string | null,
    number: string,
    origin: string,
    destination: string,
    departureTime: Date,
    arrivalTime: Date,
    delay: number,
    alertMessage: string | null,
    stops: Stop[],
    info: Info[];
}

export interface Stop {
    id: string;
    name: string;
    scheduledArrival: Date;
    scheduledDeparture: Date;
    actualArrival: Date | null;
    actualDeparture: Date | null;
    arrivalDelay: number | null;
    departureDelay: number | null;
    scheduledPlatform: string | null;
    actualPlatform: string | null;
    status: "regular" | "not_planned" | "canceled";
}

export interface Info {
    id: number;
    message: string;
    url: string;
    date: Date;
}

export interface Train {
    company: string | null;
    category: string | null;
    shortCategory: string | null;
    number: string;
    destination: string;
    departureTime: Date;
    delay: string;
    platform: string;
    departing: boolean;
    stops: {
        name: string;
        time: string;
    }[];
}

export interface StationMonitor {
    name: string;
    trains: Train[];
    alerts: string;
}