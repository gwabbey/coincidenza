export interface Directions {
    trips: Trip[]
    direct: Trip[]
    pageCursor?: string
}

export interface Location {
    id: string
    lat: string
    lon: string
    name: string
    address: string
}

export interface Trip {
    duration: number
    startTime: string
    endTime: string
    transfers: number
    legs: Leg[]
}

export interface Leg {
    mode: string
    from: From
    to: To
    duration: number
    startTime: string
    endTime: string
    scheduledStartTime: string
    scheduledEndTime: string
    realTime: RealTime
    scheduled: boolean
    distance: number
    legGeometry: LegGeometry
    steps?: Step[]
    interlineWithPreviousLeg?: boolean
    headsign?: string
    routeType?: number
    agencyName?: string
    agencyUrl?: string
    agencyId?: string
    tripId?: string
    routeShortName?: string
    routeLongName?: string
    routeColor?: string
    tripShortName?: string
    displayName?: string
    cancelled: boolean
    source?: string
    intermediateStops?: IntermediateStop[]
}

export interface From {
    name: string
    lat: number
    lon: number
    level: number
    departure: string
    scheduledDeparture: string
    vertexType: string
    stopId?: string
    pickupType?: string
    dropoffType?: string
    cancelled?: boolean
    arrival?: string
    scheduledArrival?: string
}

export interface To {
    name: string
    stopId?: string
    lat: number
    lon: number
    level: number
    arrival: string
    scheduledArrival: string
    vertexType: string
    pickupType?: string
    dropoffType?: string
    cancelled?: boolean
}

export interface LegGeometry {
    points: string
    precision: number
    length: number
}

export interface Step {
    relativeDirection: string
    distance: number
    fromLevel: number
    toLevel: number
    polyline: Polyline
    streetName: string
    exit: string
    stayOn: boolean
    area: boolean
    toll: boolean
    osmWay?: number
}

export interface Polyline {
    points: string
    precision: number
    length: number
}

export interface IntermediateStop {
    name: string
    stopId: string
    lat: number
    lon: number
    level: number
    arrival: string
    departure: string
    scheduledArrival: string
    scheduledDeparture: string
    vertexType: string
    pickupType: string
    dropoffType: string
    cancelled: boolean
}

export interface Info {
    message: string;
    url: string | null;
    date: string | null;
    source: string;
}

export interface RealTime {
    tracked: boolean
    delay: number | null
    url: string | null
    info: Info[]
    status: string
}