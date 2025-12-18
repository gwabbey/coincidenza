import axios from 'axios';
import axiosRetry from 'axios-retry';
import {getDistance} from "@/utils";

export async function fetchData(endpoint: string, options: { params?: Record<string, string> } = {}) {
    let url = `https://app-tpl.tndigit.it/gtlservice/${endpoint}`;

    if (options.params) {
        const searchParams = new URLSearchParams(options.params);
        url += `?${searchParams.toString()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const client = axios.create({
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "it.tndigit.mit",
            Authorization: `Basic ${Buffer.from(`${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`).toString("base64")}`
        }, signal: controller.signal,
    });

    axiosRetry(client, {
        retries: 5, retryDelay: axiosRetry.exponentialDelay,
    });

    try {
        const response = await client.get(url);
        clearTimeout(timeout);
        return response.data;
    } catch (error: any) {
        if (axios.isCancel(error)) {
            return null;
        }
        throw new Error(`trentino trasporti data fetch error: ${error.message}`);
    }
}

const stopsCache = new Map();

export async function getStops(type: string) {
    if (stopsCache.has(type)) return stopsCache.get(type);

    const data = await fetchData('stops', type ? {params: {type}} : undefined);
    stopsCache.set(type, data);
    return data;
}

export async function getAllStops() {
    return await fetchData('stops');
}

export async function getClosestBusStops(lat: string, lon: string) {
    const stops = await getAllStops();

    const stopsWithDistance = stops.map((stop: any) => ({
        ...stop, distance: getDistance(parseFloat(lat), parseFloat(lon), stop.stopLat, stop.stopLon),
    }));

    return stopsWithDistance.sort((a: any, b: any) => a.distance - b.distance);
}

export async function getStopDepartures(stopId: string, type: string) {
    const [departures, routes] = await Promise.all([fetchData('trips_new', {
        params: {
            type, stopId: stopId.toString(), limit: "6", refDateTime: new Date().toISOString()
        }
    }), getRoutes(type)]);

    if (!departures) return null;
    return departures.map((trip: any) => ({
        ...trip, route: routes.find((r: any) => r.routeId === trip.routeId) || null
    }));
}

const routesCache = new Map<string, any>();

export async function getRoutes(type: string) {
    if (routesCache.has(type)) return routesCache.get(type);

    const routes = await fetchData('routes', type ? {params: {type}} : undefined);
    routesCache.set(type, routes);
    return routes;
}

export async function getTrip(id: string) {
    const trip = await fetchData(`trips/${id}`);
    if (!trip) return null;

    return {
        id: trip.tripId,
        status: trip.lastSequenceDetection === trip.stopTimes[trip.stopTimes.length - 1].stopSequence ? "completed" : !trip.lastEventRecivedAt ? "scheduled" : "active",
        delay: trip.delay,
        lastUpdate: trip.lastEventRecivedAt,
        currentStopIndex: !trip.lastEventRecivedAt ? -1 : trip.lastSequenceDetection - 1,
    };
}

function stringToIso(time: string) {
    const [h, m, s] = time.split(":").map(Number);
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s || 0);
    return date.toISOString();
}

export async function getTripDetails(id: string) {
    const trip = await fetchData(`trips/${id}`);
    const stops = await getStops(trip.type);
    const routes = await getRoutes(trip.type);

    if (!trip || !stops || !routes) return null;

    const stopMap = new Map<string, string>(stops.map((stop: any) => [stop.stopId, stop.stopName]));
    const getStopName = (stopId: string) => stopMap.get(stopId) ?? "--";
    const getRoute = (routeId: string) => routes.find((r: any) => r.routeId === routeId);

    let lastValidTime: Date | null = null;

    const getValidTime = (timeStr: string) => {
        if (timeStr) {
            const iso = stringToIso(timeStr);
            lastValidTime = new Date(iso);
            return iso;
        } else if (lastValidTime) {
            const next = new Date(lastValidTime.getTime() + 60_000); // +1 minute
            lastValidTime = next;
            return next.toISOString();
        } else {
            return stringToIso("00:00:00");
        }
    };

    return {
        id: trip.tripId,
        currentStopIndex: !trip.lastEventRecivedAt ? -1 : trip.lastSequenceDetection - 1,
        lastKnownLocation: trip.lastEventRecivedAt && new Date(trip.lastEventRecivedAt) > new Date(stringToIso(trip.stopTimes[0].departureTime)) ? getStopName(trip.stopTimes[trip.lastSequenceDetection - 1]) : null,
        lastUpdate: trip.lastEventRecivedAt,
        status: trip.lastSequenceDetection === trip.stopTimes[trip.stopTimes.length - 1].stopSequence ? "completed" : !trip.lastEventRecivedAt ? "scheduled" : "active",
        category: trip.type === "U" ? "Urbano" : "Extraurbano",
        vehicleId: trip.matricolaBus,
        color: getRoute(trip.routeId).routeColor ? getRoute(trip.routeId).routeColor : trip.type === "U" ? "1AC964" : "2C7FFF",
        route: getRoute(trip.routeId).routeShortName,
        origin: getStopName(trip.stopTimes[0].stopId),
        destination: trip.tripHeadsign,
        departureTime: getValidTime(trip.stopTimes[0].departureTime),
        arrivalTime: getValidTime(trip.stopTimes[trip.stopTimes.length - 1].arrivalTime),
        delay: trip.delay,
        stops: trip.stopTimes.map((stop: any) => ({
            id: stop.stopId,
            name: getStopName(stop.stopId),
            scheduledArrival: getValidTime(stop.arrivalTime),
            scheduledDeparture: getValidTime(stop.departureTime),
            status: "regular",
            lat: stops.find((s: any) => s.stopId === stop.stopId).stopLat ?? "",
            lon: stops.find((s: any) => s.stopId === stop.stopId).stopLon ?? ""
        })),
        info: routes
            .find((route: any) => route.routeId === trip.routeId)
            .news.map((alert: any) => ({
                message: alert.details ?? "",
                date: new Date(alert.startDate).toISOString() ?? "",
                source: "Trentino Trasporti",
                url: alert.url,
            })),
    }
}

type BusStop = {
    stopId: string
    stopName: string
    distance: number
    type: string
}

type Trip = {
    tripId: string
    stopId: string
    stopName: string
    distance: number
    delay?: number
    stopNext?: string
    stopTimes: Array<{
        stopId: string
        departureTime: string
    }>
    oraArrivoProgrammataAFermataSelezionata: string
}

export async function getFilteredDepartures(lat: string, lon: string) {
    const allStops = await getClosestBusStops(lat, lon)
    const walkableStops = getNearbyStops(allStops, 100)
    
    if (walkableStops.length === 0) {
        return {error: 'no_stops', trips: []}
    }

    const departurePromises = walkableStops.map(async (stop) => {
        try {
            const departures = await getStopDepartures(stop.stopId, stop.type)
            if (!departures) return []

            return departures.map((trip: any) => ({
                ...trip, stopId: stop.stopId, stopName: stop.stopName, distance: stop.distance
            }))
        } catch (error) {
            console.error(`Error fetching departures for stop ${stop.stopId}:`, error)
            return []
        }
    })

    const allDeparturesArrays = await Promise.all(departurePromises)
    const allDepartures = allDeparturesArrays.flat()

    const uniqueTrips = filterTrips(allDepartures)
    const sortedTrips = sortTripsByDepartureTime(uniqueTrips)

    return {error: null, trips: sortedTrips}
}

function getNearbyStops(stops: BusStop[], radiusMeters = 100): BusStop[] {
    const nearby = stops.filter(stop => stop.distance <= radiusMeters)

    if (nearby.length === 0 && radiusMeters < 10_000) {
        return getNearbyStops(stops, radiusMeters * 2)
    }

    return nearby
}

function filterTrips(trips: Trip[]): Trip[] {
    const seen = new Set<string>()
    const now = new Date()

    return trips.filter(trip => {
        if (seen.has(trip.tripId)) return false
        seen.add(trip.tripId)

        if (trip.stopTimes[trip.stopTimes.length - 1].stopId === trip.stopId) {
            return false
        }

        const selectedStop = trip.stopTimes.find(s => String(s.stopId) === String(trip.stopId))
        if (!selectedStop) return false

        const [h, m, s] = selectedStop.departureTime.split(":").map(Number)
        const departure = new Date(now)
        departure.setHours(h, m, s, 0)

        if (trip.delay) {
            departure.setMinutes(departure.getMinutes() + trip.delay)
        }

        const diff = now.getTime() - departure.getTime()
        return !(diff > 120000 && trip.stopNext !== trip.stopId)
    })
}

function sortTripsByDepartureTime(trips: Trip[]): Trip[] {
    return trips.sort((a, b) => {
        const timeA = new Date(a.oraArrivoProgrammataAFermataSelezionata).getTime()
        const timeB = new Date(b.oraArrivoProgrammataAFermataSelezionata).getTime()
        return timeA - timeB
    })
}