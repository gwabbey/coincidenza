import axios from 'axios';
import axiosRetry from 'axios-retry';
import {Stop, StopTime} from './types';
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
            Authorization: `Basic ${Buffer.from(
                `${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`
            ).toString("base64")}`
        },
        signal: controller.signal,
    });

    axiosRetry(client, {
        retries: 5,
        retryDelay: axiosRetry.exponentialDelay,
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

export async function getClosestBusStops(userLat: number, userLon: number) {
    const stops = await getAllStops();

    const stopsWithDistance = stops.map((stop: any) => ({
        ...stop,
        distance: getDistance(userLat, userLon, stop.stopLat, stop.stopLon),
    }));

    return stopsWithDistance.sort((a: any, b: any) => a.distance - b.distance);
}

export async function getStopDepartures(stopId: number, type: string) {
    const [departures, routes] = await Promise.all([
        fetchData('trips_new', {
            params: {
                type,
                stopId: stopId.toString(),
                limit: "3",
                refDateTime: new Date().toISOString()
            }
        }),
        getRoutes(type)
    ]);

    if (!departures) return null;
    return departures.map((trip: any) => ({
        ...trip,
        route: routes.find((r: any) => r.routeId === trip.routeId) || null
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
        delay: trip.delay,
        stopLast: trip.stopLast,
        lastEventRecivedAt: trip.lastEventRecivedAt,
        lastSequenceDetection: trip.lastSequenceDetection,
        matricolaBus: trip.matricolaBus,
    };
}

export async function getTripDetails(id: string) {
    const trip = await fetchData(`trips/${id}`);
    if (!trip) return null;
    const stops = await getStops(trip.type);
    const routes = await getRoutes(trip.type);

    if (!trip || !stops || !routes) return null;

    const stopMap = new Map(
        stops.map((stop: Stop) => [stop.stopId, stop.stopName])
    );

    return {
        ...trip,
        stopTimes: trip.stopTimes.map((stopTime: StopTime) => ({
            ...stopTime,
            stopName: stopMap.get(stopTime.stopId) || 'Fermata sconosciuta'
        })),
        route: routes.find((route: any) => route.routeId === trip.routeId)
    };
}