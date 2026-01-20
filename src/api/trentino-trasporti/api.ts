import {createAxiosClient} from "@/api/axios";
import {cache} from "react";
import {BusDeparture} from "@/api/types";

const axios = createAxiosClient();

export async function fetchData(endpoint: string, options: { params?: Record<string, string> } = {}) {
    let url = `https://app-tpl.tndigit.it/gtlservice/${endpoint}`;

    if (options.params) {
        const searchParams = new URLSearchParams(options.params);
        url += `?${searchParams.toString()}`;
    }

    try {
        const response = await axios.get(url, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Requested-With": "it.tndigit.mit",
                Authorization: `Basic ${Buffer.from(`${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`).toString("base64")}`
            }, timeout: 30000, validateStatus: (status) => status < 500,
        });

        if (!response.data) {
            console.warn('empty response:', endpoint);
            return null;
        }

        return response.data;
    } catch (error: any) {
        if (error.response) {
            console.error(`TT fetch error ${error.response.status}:`, endpoint);
            if (error.response.status === 404) {
                return null;
            }
        } else if (error.request) {
            console.error('no response received:', endpoint);
        }

        console.error('TT error:', error.message);
        return null;
    }
}

export const getStops = cache(async (type: string) => {
    return await fetchData('stops', type ? {params: {type}} : undefined);
});

export const getRoutes = cache(async (type: string) => {
    return await fetchData('routes', type ? {params: {type}} : undefined);
});

async function getRouteById(type: string, routeId: string) {
    const routes = await getRoutes(type);
    if (!Array.isArray(routes)) {
        return null;
    }
    return routes.find((r: any) => r.routeId === routeId) ?? null;
}

export async function getStopDepartures(stopId: string, type: string) {
    const departures = await fetchData('trips_new', {
        params: {
            type, stopId: stopId.toString(), limit: "10", refDateTime: new Date().toISOString()
        }
    });

    if (!departures) return null;
    return Promise.all(departures.map(async (trip: any) => ({
        ...trip, route: await getRouteById(type, trip.routeId)
    })));
}

function filterTrips(trips: any[]) {
    const now = new Date()

    return trips.filter(trip => {
        if (trip.stopTimes.at(-1).stopId.toString() === trip.stopId && trip.stopTimes[0].stopId.toString() !== trip.stopId) {
            return false
        }

        const selectedStop = trip.stopTimes.find((s: any) => s.stopId.toString() === trip.stopId.toString())
        if (!selectedStop) return false

        const [h, m, s] = selectedStop.departureTime.split(":").map(Number)
        const departure = new Date(now)
        departure.setHours(h, m, s || 0, 0)

        if (departure < now) {
            departure.setDate(departure.getDate() + 1)
        }

        departure.setMinutes(departure.getMinutes() + (trip.delay ?? 0))

        const diff = now.getTime() - departure.getTime()

        return !(diff > 120000 && trip.stopNext !== trip.stopId)
    })
}

export async function getDepartures(stops: Array<{
    id: string,
    name: string,
    distance: number,
    type: string
}>): Promise<BusDeparture[]> {
    const departurePromises = stops.map(async (stop) => {
        try {
            const departures = await getStopDepartures(stop.id, stop.type);
            if (!departures) return [];

            return departures.map((trip: any) => ({
                ...trip,
                stopId: stop.id,
                stopName: stop.name,
                distance: stop.distance,
            }));
        } catch (error) {
            console.error(`Error fetching TT departures for stop ${stop.id}:`, error);
            return [];
        }
    });

    const trips = filterTrips((await Promise.all(departurePromises)).flat()).sort((a, b) => {
        const timeA = new Date(a.oraArrivoProgrammataAFermataSelezionata).getTime();
        const timeB = new Date(b.oraArrivoProgrammataAFermataSelezionata).getTime();
        return timeA - timeB;
    })

    return trips.map((trip: any) => {
        const arrivalTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata).getTime();

        const [h, m, s] = trip.stopTimes[0].departureTime.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, s || 0, 0);
        const departing = arrivalTime - Date.now() <= 60000;

        return {
            id: trip.tripId,
            route: trip.route.routeShortName ?? "Bus",
            color: trip.route.routeColor ?? (trip.type === "U" ? "1AC964" : "2D7FFF"),
            company: "trentino-trasporti",
            destination: trip.tripHeadsign,
            departureTime: trip.oraArrivoProgrammataAFermataSelezionata,
            delay: trip.delay,
            tracked: trip.lastEventRecivedAt,
            departing,
        };
    });
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
    const route = getRoute(trip.routeId);

    let lastValidTime: Date | null = null;

    const getValidTime = (time: string) => {
        if (time) {
            const iso = stringToIso(time);
            lastValidTime = new Date(iso);
            return iso;
        } else if (lastValidTime) {
            const next = new Date(lastValidTime.getTime() + 60_000);
            lastValidTime = next;
            return next.toISOString();
        } else {
            return stringToIso("00:00:00");
        }
    };

    return {
        id: trip.tripId,
        company: "trentino-trasporti",
        currentStopIndex: !trip.lastEventRecivedAt ? -1 : trip.lastSequenceDetection - 1,
        lastKnownLocation: trip.lastEventRecivedAt && new Date(trip.lastEventRecivedAt) > new Date(stringToIso(trip.stopTimes[0].departureTime)) ? getStopName(trip.stopTimes[trip.lastSequenceDetection - 1]) : null,
        lastUpdate: trip.lastEventRecivedAt,
        status: trip.lastSequenceDetection === trip.stopTimes[trip.stopTimes.length - 1].stopSequence ? "completed" : !trip.lastEventRecivedAt ? "scheduled" : "active",
        category: trip.type === "U" ? "Urbano" : "Extraurbano",
        vehicleId: trip.matricolaBus,
        color: route.routeColor ? route.routeColor : trip.type === "U" ? "1AC964" : "2C7FFF",
        route: route.routeShortName,
        origin: getStopName(trip.stopTimes[0].stopId),
        destination: trip.tripHeadsign,
        departureTime: getValidTime(trip.stopTimes[0].departureTime),
        arrivalTime: getValidTime(trip.stopTimes[trip.stopTimes.length - 1].arrivalTime),
        delay: trip.delay,
        stops: trip.stopTimes.map((stop: any) => ({
            id: trip.type === "U" ? `ttu_${stop.stopId}` : `tte_${stop.stopId}`,
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