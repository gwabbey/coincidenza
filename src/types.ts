export interface Stop {
    stopId: number;
    stopName: string;
    stopCode: string;
    type: string;
    town?: string | null;
    distance: number;
    stopLat?: number | null;
    stopLon?: number | null;
    routes: RouteDetails[];
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
    type: string;
}

export interface Route {
    id: string;
    details: RouteDetails;
    stops: RouteStop[];
}

export interface PopularStop {
    id: number;
    name: string;
    type: string;
}

export interface Trip {
    cableway: {
        routeId: number;
        descrizione: string;
        type: string;
        descrColor: string;
    } | null;
    corsaPiuVicinaADataRiferimento: boolean;
    delay: number;
    directionId: number;
    indiceCorsaInLista: number;
    lastEventRecivedAt: string;
    lastSequenceDetection: number;
    matricolaBus: number;
    oraArrivoEffettivaAFermataSelezionata: string | null;
    oraArrivoProgrammataAFermataSelezionata: string | null;
    routeId: number;
    stopLast: number;
    stopNext: number;
    stopTimes: Array<{
        arrivalTime: string;
        departureTime: string;
        stopId: number;
        stopSequence: number;
        tripId: string;
        type: string;
        stopName: string;
    }>;
    totaleCorseInLista: number;
    tripHeadsign: string;
    tripId: string;
    type: string;
    wheelchairAccessible: number;
    route: RouteDetails;
}