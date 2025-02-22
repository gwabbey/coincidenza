import { Realtime } from "@/api/otp/types"

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
}

export interface FromPlace {
    id: string
    name: string
}

export interface ToPlace {
    id: string
    name: string
}

export interface Line {
    id: string
    name: string
    code: string
    color: string
}

export interface Authority {
    id: string
    name: string
}
