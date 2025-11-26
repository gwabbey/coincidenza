"use server";
import axios from "axios";
import polyline from "@mapbox/polyline";
import {From, IntermediateStop, To} from "@/api/motis/types";

export async function getRailPolyline(stops: (From | IntermediateStop | To)[]) {
    if (!stops || stops.length === 0) return "";

    const coords = stops.map((stop) => `${stop.lon},${stop.lat}`).join(";");

    try {
        const {data} = await axios.get(`https://signal.eu.org/osm/eu/route/v1/train/${coords}?alternatives=false&steps=false&overview=full`);

        const line = data.routes?.[0]?.geometry;
        if (!line) return "";

        const decoded = polyline.decode(line);

        return polyline.encode(decoded, 6);
    } catch (error) {
        console.error("Error fetching rail polyline:", error);
        return "";
    }
}