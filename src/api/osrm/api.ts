"use server";
import polyline from "@mapbox/polyline";
import {From, IntermediateStop, To} from "@/api/motis/types";
import {createAxiosClient} from "@/api/axios";
import {cache} from "react";

const axios = createAxiosClient();

export async function getRoadPolyline(stops: (From | IntermediateStop | To)[]) {
    if (!stops || stops.length === 0) return "";

    const coords = stops.map((stop) => `${stop.lon},${stop.lat}`).join(";");

    const getCachedPolyline = cache(async (coords: string) => {
        try {
            const {data} = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full`);

            const line = data.routes?.[0]?.geometry;
            if (!line) return "";

            const decoded = polyline.decode(line);
            return polyline.encode(decoded, 6);
        } catch (error) {
            console.error("Error fetching rail polyline:", error);
            return "";
        }
    });

    return getCachedPolyline(coords);
}