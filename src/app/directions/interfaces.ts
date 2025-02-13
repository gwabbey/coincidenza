export interface Trip {
    previousPageCursor: string
    nextPageCursor: string
    tripPatterns: TripPattern[]
}

export interface TripPattern {
    aimedStartTime: string
    aimedEndTime: string
    expectedEndTime: string
    expectedStartTime: string
    duration: number
    distance: number
    legs: Leg[]
    systemNotices: any[]
}

export interface IntermediateQuay {
    id: number
    name: string
}

export interface Leg {
    id?: string
    serviceJourney?: ServiceJourney
    mode: string
    aimedStartTime: string
    aimedEndTime: string
    expectedEndTime: string
    expectedStartTime: string
    realtime: boolean
    distance: number
    intermediateQuays: IntermediateQuay[]
    duration: number
    fromPlace: FromPlace
    toPlace: ToPlace
    toEstimatedCall?: ToEstimatedCall
    line?: Line
    authority?: Authority
    pointsOnLink: PointsOnLink
    interchangeTo?: InterchangeTo
    interchangeFrom?: InterchangeFrom
}

export interface ServiceJourney {
    id: string
    publicCode?: string
}

export interface FromPlace {
    name: string
    quay?: Quay
}

export interface Quay {
    id: string
}

export interface ToPlace {
    name: string
    quay?: Quay2
}

export interface Quay2 {
    id: string
}

export interface ToEstimatedCall {
    destinationDisplay: DestinationDisplay
}

export interface DestinationDisplay {
    frontText: string
}

export interface Line {
    publicCode: string
    name: string
    id: string
    presentation: Presentation
}

export interface Presentation {
    colour: any
}

export interface Authority {
    name: string
    id: string
}

export interface PointsOnLink {
    points: string
}

export interface InterchangeTo {
    staySeated: boolean
}

export interface InterchangeFrom {
    staySeated: boolean
}
