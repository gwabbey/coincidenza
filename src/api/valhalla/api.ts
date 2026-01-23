"use server";
import {From, IntermediateStop, To} from "@/api/motis/types";
import {createAxiosClient} from "@/api/axios";
import {cache} from "react";

const axios = createAxiosClient();

const VALHALLA = process.env.VALHALLA || "http://valhalla:8002";

export async function getRoadPolyline(stops: (From | IntermediateStop | To)[]) {
    if (!stops || stops.length === 0) return "";

    const coords = stops.map((stop) => `${stop.lon},${stop.lat}`).join(";");

    const getCachedPolyline = cache(async (coords: string) => {
        try {
            const locations = coords.split(";").map((coord, i, arr) => {
                const [lon, lat] = coord.split(",").map(Number);
                return {
                    lat,
                    lon,
                    type: i === 0 || i === arr.length - 1 ? "break" : "via",
                    rank_candidates: false,
                    radius: 30,
                    minimum_reachability: 15,
                    node_snap_tolerance: 15,
                };
            });

            const {data} = await axios.get(`${VALHALLA}/route`, {
                params: {
                    json: JSON.stringify({
                        locations, costing: "bus", search_filter: {
                            min_road_class: "tertiary", exclude_ramp: true
                        }, directions_type: "none", alternates: 0
                    })
                },
            });

            let line: string = data.trip?.legs?.[0]?.shape ?? "";
            if (!line) return "";

            line = line.replace(/\\\\/g, "\\");

            const polylineLib = await import("@mapbox/polyline");
            const decoded = polylineLib.decode(line, 6);
            return polylineLib.encode(decoded, 6);
        } catch (err) {
            console.error("Error fetching road polyline:", err);
            return "";
        }
    });

    return getCachedPolyline(coords);
}