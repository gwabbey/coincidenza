import {BusDeparture} from "@/api/types";
import {getDepartures as getTTDepartures} from "@/api/trentino-trasporti/api";
import {getDepartures as getCiceroDepartures} from "@/api/cicero/api";
import {getBoundingBox, getDistance} from "@/utils";
import {getStopsInArea} from "@/api/motis/geocoding";

export async function getClosestStops(lat: string, lon: string) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const box = getBoundingBox(latNum, lonNum, 100);
    const stops = await getStopsInArea(box.minLat, box.minLon, box.maxLat, box.maxLon);

    const res = stops
        .map((stop: any) => {
            const [prefix, id] = stop.stopId.split("_");
            const type = prefix === "ttu" ? "U" : "E";

            return {
                id,
                type,
                prefix,
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
                distance: getDistance(latNum, lonNum, stop.lat, stop.lon),
            };
        });

    return res.sort((a, b) => a.distance - b.distance);
}

export async function getFilteredDepartures(lat: string, lon: string): Promise<BusDeparture[]> {
    const closestStops = await getClosestStops(lat, lon);

    if (closestStops.length === 0) return [];

    const stopsByCompany = closestStops.reduce((acc, stop) => {
        const company = stop.prefix;
        if (!acc[company]) acc[company] = [];
        acc[company].push(stop);
        return acc;
    }, {} as Record<string, typeof closestStops>);

    const allDeparturesPromises = Object.entries(stopsByCompany).map(async ([company, stops]) => {
        if (company === "tte" || company === "ttu") {
            return await getTTDepartures(stops);
        } else if (company === "atv") {
            return getCiceroDepartures(stops);
        }
        return [];
    });

    const allDepartures = await Promise.all(allDeparturesPromises);

    const uniqueDepartures = Array.from(new Map(allDepartures
        .flat()
        .map(dep => [dep.id, dep])).values());

    return uniqueDepartures.sort((a, b) => {
        const timeA = new Date(new Date(a.departureTime).getTime() + a.delay * 60000).getTime();
        const timeB = new Date(new Date(b.departureTime).getTime() + b.delay * 60000).getTime();
        return timeA - timeB;
    });
}