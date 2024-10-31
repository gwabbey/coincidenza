export interface Stop {
    stopId: string;
    stopName: string;
    stopCode: string;
    type: 'E' | 'U';
    town?: string;
    distance: number;
}

export interface RouteDetails {
    type: 'U' | 'E';
    routeShortName: string;
    routeLongName: string;
    news?: Array<{
        header: string;
        details: string;
        url?: string;
    }>;
}

export interface RouteStop {
    matricolaBus: string | null;
    tripHeadsign: string;
    delay: number | null;
    lastEventRecivedAt: string | null;
    stopTimes: Array<{ stopId: string }>;
    oraArrivoEffettivaAFermataSelezionata: string;
    oraArrivoProgrammataAFermataSelezionata: string;
}

export interface Route {
    id: string;
    details: RouteDetails;
    stops: RouteStop[];
}