import { Info } from "../types";

export interface Coordinates {
    lat: number;
    lon: number;
}

export interface Directions {
    trips: Trip[]
    nextPageCursor?: string
}

export interface Trip {
    aimedStartTime: string
    aimedEndTime: string
    expectedEndTime: string
    expectedStartTime: string
    duration: number
    distance: number
    legs: Leg[]
}


export interface Leg {
    id?: string
    code?: string
    mode: string
    aimedStartTime: string
    aimedEndTime: string
    expectedEndTime: string
    expectedStartTime: string
    realtime: Realtime
    distance: number
    intermediateQuays: IntermediateQuay[]
    duration: number
    fromPlace: FromPlace
    toPlace: ToPlace
    destination: string
    line?: Line
    authority?: Authority
    points: string
    tripId?: string
}

export interface IntermediateQuay {
    id: string
    name: string
    latitude: number
    longitude: number
}

export interface FromPlace {
    id: string
    name: string
    latitude: number
    longitude: number
}

export interface ToPlace {
    id: string
    name: string,
    latitude: number
    longitude: number
}

export interface Line {
    id: string
    name: string
    category: string
    color: string
    code: string
}

export interface Authority {
    id: string
    name: string
}

export interface Realtime {
    delay: number | null
    destination: string | null
    info: Info[] | null
}