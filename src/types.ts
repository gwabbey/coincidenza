export interface Coordinates {
    lat: number;
    lon: number;
}

export interface Stop {
    stopId: number;
    stopName: string;
    stopCode: string;
    type: string;
    town?: string | null;
    distance: number | null;
    intermediateQuays: Array<{ id: number, name: string }>;
    stopLat?: number | null;
    stopLon?: number | null;
    routes: RouteDetails[];
}

export interface RouteDetails {
    type: string;
    routeId: number;
    routeShortName: string;
    routeLongName: string;
    news?: RouteNews[] | null;
    cableway?: Cableway | null;
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

export interface Cableway {
    routeId: number;
    descrizione: string;
    type: string;
    descrColor: string;
}

export interface Trip {
    cableway: Cableway | null;
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
}

export interface StopNews {
    idFeed: any
    agencyId: string
    serviceType: string
    startDate: string
    endDate: string
    header: string
    details: string
    stopId: string
    url: string
    routeIds: number[]
}