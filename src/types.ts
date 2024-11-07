export interface Stop {
    stopId: string;
    stopName: string;
    stopCode: string;
    type: 'E' | 'U';
    town?: string;
    distance: number;
    stopLat?: number;
    stopLon?: number;
}

export interface RouteDetails {
    type: 'U' | 'E';
    routeId: number;
    routeShortName: string;
    routeLongName: string;
    news?: RouteNews[];
}

export interface RouteNews {
    header: string;
    details: string;
    url?: string;
}

export interface RouteStop {
    matricolaBus: string | null;
    tripHeadsign: string;
    delay: number | null;
    lastEventRecivedAt: string | null;
    stopTimes: Array<{ stopId: string, arrivalTime: string, departureTime: string }>;
    oraArrivoEffettivaAFermataSelezionata: string;
    oraArrivoProgrammataAFermataSelezionata: string;
    tripId: string;
}

export interface Route {
    id: string;
    details: RouteDetails;
    stops: RouteStop[];
}