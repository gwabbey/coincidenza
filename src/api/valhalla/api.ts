"use server";
import {From, IntermediateStop, To} from "@/api/motis/types";
import {createAxiosClient} from "@/api/axios";
import {cache} from "react";

const axios = createAxiosClient();

const VALHALLA = process.env.VALHALLA || "http://valhalla:8002";

export async function getRoadPolyline(stops: (From | IntermediateStop | To)[]) {
    if (!stops || stops.length === 0) return "";

    const getCachedPolyline = cache(async (stopsKey: string) => {
        try {
            const parsedStops = JSON.parse(stopsKey);

            if (parsedStops.length <= 50) {
                return await fetchSinglePolyline(parsedStops);
            }

            const chunks: any[][] = [];
            for (let i = 0; i < parsedStops.length; i += 50 - 1) {
                const chunk = parsedStops.slice(i, i + 50);
                chunks.push(chunk);
            }

            const polylines = await Promise.all(chunks.map(chunk => fetchSinglePolyline(chunk)));

            const polylineLib = await import("@mapbox/polyline");
            const allPoints: [number, number][] = [];

            for (const polyline of polylines) {
                if (!polyline) continue;
                const decoded = polylineLib.decode(polyline, 6);
                const pointsToAdd = allPoints.length > 0 ? decoded.slice(1) : decoded;
                allPoints.push(...pointsToAdd);
            }

            return polylineLib.encode(allPoints, 6);

        } catch (err) {
            console.error("Error fetching road polyline:", err);
            return "";
        }
    });

    return getCachedPolyline(JSON.stringify(stops));
}

async function fetchSinglePolyline(stops: any[]): Promise<string> {
    const locations = stops.map((stop: any) => ({
        lat: stop.lat,
        lon: stop.lon,
        type: "via",
        rank_candidates: false,
        radius: 15,
        preferred_side: "either",
        minimum_reachability: 150
    }));

    const {data} = await axios.post(`${VALHALLA}/route`, {
        locations, costing: "bus", costing_options: {
            bus: {
                ignore_oneways: true, maneuver_penalty: 15
            }
        }, alternates: 0
    });

    let line: string = data.trip?.legs?.[0]?.shape ?? "";
    if (!line) return "";

    line = line.replace(/\\\\/g, "\\");

    const polylineLib = await import("@mapbox/polyline");
    const decoded = polylineLib.decode(line, 6);
    return polylineLib.encode(decoded, 6);
}