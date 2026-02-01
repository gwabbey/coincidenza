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
                const locations = parsedStops.map((stop: any, i: number, arr: any[]) => ({
                    lat: stop.lat,
                    lon: stop.lon,
                    type: i === 0 || i === arr.length - 1 ? "break" : "via",
                    rank_candidates: false,
                    radius: 10
                }));

                const {data} = await axios.post(`${VALHALLA}/route`, {
                    locations, costing: "bus", "costing_options": {
                        "bus": {
                            "maneuver_penalty": 15,
                            "private_access_penalty": 450,
                            "ignore_closures": true,
                            "ignore_restrictions": true,
                            "closure_factor": 9,
                            "service_penalty": 15,
                            "service_factor": 1,
                            "top_speed": 90,
                            "fixed_speed": 0,
                        }
                    }, directions_type: "none", alternates: 0
                });

                let line: string = data.trip?.legs?.[0]?.shape ?? "";
                if (!line) return "";

                line = line.replace(/\\\\/g, "\\");

                const polylineLib = await import("@mapbox/polyline");
                const decoded = polylineLib.decode(line, 6);
                return polylineLib.encode(decoded, 6);
            } catch
                (err) {
                console.error("Error fetching road polyline:", err);
                return "";
            }
        }
    )


    return getCachedPolyline(JSON.stringify(stops));
}