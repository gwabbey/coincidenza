import {getBoundingBox, getDistance} from "@/utils";
import {createAxiosClient} from "@/api/axios";
import {cache} from "react";
import {getStopsInArea} from "@/api/motis/geocoding";

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
            console.error(`trentino trasporti error ${error.response.status}:`, endpoint);
            if (error.response.status === 404) {
                return null;
            }
        } else if (error.request) {
            console.error('no response received:', endpoint);
        }

        console.error('trentino trasporti error:', error.message);
        return null;
    }
}

export const getStops = cache(async (type: string) => {
    return await fetchData('stops', type ? {params: {type}} : undefined);
});

export const getRoutes = cache(async (type: string) => {
    return await fetchData('routes', type ? {params: {type}} : undefined);
});

export async function getClosestStops(lat: string, lon: string) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const box = getBoundingBox(latNum, lonNum, 50);
    const stops = await getStopsInArea(box.minLat, box.minLon, box.maxLat, box.maxLon);

    const res = stops
        .filter((stop: any) => stop.stopId.startsWith("ttu") || stop.stopId.startsWith("tte"))
        .map((stop: any) => {
            const [prefix, id] = stop.stopId.split("_");
            const type = prefix === "ttu" ? "U" : "E";

            return {
                id,
                type,
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
                distance: getDistance(latNum, lonNum, stop.lat, stop.lon),
            };
        });

    return res.sort((a, b) => a.distance - b.distance);
}

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
            type, stopId: stopId.toString(), limit: "6", refDateTime: new Date().toISOString()
        }
    });

    if (!departures) return null;
    return Promise.all(departures.map(async (trip: any) => ({
        ...trip, route: await getRouteById(type, trip.routeId)
    })));
}

function getStopsAway(selectedStopId: string, stopTimes: {
    stopId: string; departureTime: string
}[], delay: number = 0, proximityMinutes = 2): number | null {
    const now = new Date();

    const selectedIndex = stopTimes.findIndex(s => s.stopId.toString() === selectedStopId);
    if (selectedIndex === -1) return null;

    const parseTime = (timeStr: string) => {
        const [h, m, s] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, s || 0, 0);
        return d;
    };

    const getAdjustedTime = (stop: typeof stopTimes[0]) => {
        const t = parseTime(stop.departureTime);
        t.setMinutes(t.getMinutes() + (Math.max(delay, 0)));
        return t;
    };

    const selectedTime = getAdjustedTime(stopTimes[selectedIndex]);
    const diffMinutes = (selectedTime.getTime() - now.getTime()) / 60000;

    if (diffMinutes >= 0 && diffMinutes <= proximityMinutes) return 0;

    const passedIndex = stopTimes
        .map(getAdjustedTime)
        .findIndex((t, i, arr) => i === arr.length - 1 || (t <= now && arr[i + 1] > now));

    if (passedIndex === -1) return selectedIndex + 1;

    const stopsAway = selectedIndex - passedIndex;
    return Math.max(stopsAway, 0);
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

export async function getFilteredDepartures(lat: string, lon: string) {
    const closestStops = await getClosestStops(lat, lon)

    if (closestStops.length === 0) return [];

    const departurePromises = closestStops.map(async (stop) => {
        try {
            const departures = await getStopDepartures(stop.id, stop.type);
            if (!departures) return [];

            return departures.map((trip: any) => ({
                ...trip, stopId: stop.id, stopName: stop.name, distance: stop.distance,
            }));
        } catch (error) {
            console.error(`Error fetching departures for stop ${stop.id}:`, error);
            return [];
        }
    })

    const trips = filterTrips((await Promise.all(departurePromises)).flat()).sort((a, b) => {
        const timeA = new Date(a.oraArrivoProgrammataAFermataSelezionata).getTime()
        const timeB = new Date(b.oraArrivoProgrammataAFermataSelezionata).getTime()
        return timeA - timeB
    })

    return trips.map((trip: any) => {
        const arrivalTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata).getTime()

        const [h, m, s] = trip.stopTimes[0].departureTime.split(':').map(Number)
        const d = new Date()
        d.setHours(h, m, s || 0, 0)
        const started = d < new Date()
        const departing = arrivalTime - Date.now() <= 2 * 60 * 1000

        return {
            id: trip.tripId,
            route: trip.route.routeShortName ?? "Bus",
            color: trip.route.routeColor ?? (trip.type === "U" ? "1AC964" : "2D7FFF"),
            company: "Trentino Trasporti",
            vehicleId: trip.matricolaBus,
            destination: trip.tripHeadsign,
            departureTime: trip.oraArrivoProgrammataAFermataSelezionata,
            delay: trip.delay,
            stopsAway: getStopsAway(trip.stopId, trip.stopTimes, trip.delay),
            started,
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

    const getValidTime = (timeStr: string) => {
        if (timeStr) {
            const iso = stringToIso(timeStr);
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