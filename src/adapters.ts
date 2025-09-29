export interface NormalizedTrip {
    status: string;
    delay: number;
    lastKnownLocation: string | null;
    lastUpdate: string;
    currentStopIndex: number;
    stops: NormalizedStop[];
}

export interface NormalizedStop {
    id: string;
    name: string;
    scheduledPlatform?: string;
    actualPlatform?: string;
    scheduledArrival?: string;
    actualArrival?: string;
    scheduledDeparture?: string;
    actualDeparture?: string;
    departureDelay?: number;
    arrivalDelay?: number;
    status: string;
}

export const trenitaliaAdapter = (trip: any): NormalizedTrip => ({
    status: trip.status,
    delay: trip.delay,
    lastKnownLocation: trip.lastKnownLocation,
    lastUpdate: trip.lastUpdate,
    currentStopIndex: trip.currentStopIndex,
    stops: trip.stops.map((stop: any) => ({
        id: stop.id,
        name: stop.name,
        scheduledPlatform: stop.scheduledPlatform,
        actualPlatform: stop.actualPlatform,
        scheduledArrival: stop.scheduledArrival,
        actualArrival: stop.actualArrival,
        scheduledDeparture: stop.scheduledDeparture,
        actualDeparture: stop.actualDeparture,
        departureDelay: stop.departureDelay,
        arrivalDelay: stop.arrivalDelay,
        status: stop.status
    }))
});

export const trentinoAdapter = (trip: any, stopTimes: any[]): NormalizedTrip => {
    return {
        status: trip.lastSequenceDetection === stopTimes.length ? "completed" : "active",
        delay: trip.delay || 0,
        lastKnownLocation: trip.stopLast || null,
        lastUpdate: trip.lastEventRecivedAt || new Date().toISOString(),
        currentStopIndex: trip.lastSequenceDetection || 0,
        stops: stopTimes.map((stop: any, index: number) => ({
            id: stop.id,
            name: stop.name,
            scheduledArrival: stop.arrivalTime,
            actualArrival: index < trip.lastSequenceDetection ? stop.arrivalTime : undefined,
            scheduledDeparture: stop.departureTime,
            actualDeparture: index < trip.lastSequenceDetection ? stop.departureTime : undefined,
            status: index < trip.lastSequenceDetection ? "completed" : "scheduled"
        }))
    };
};