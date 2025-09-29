"use server";
import axios from "axios";

export async function searchStation(query: string) {
    const {data} = await axios.get(`https://int.bahn.de/web/api/reiseloesung/orte?suchbegriff=${query}%20&typ=ALL&limit=2`);
    if (!data) return [];
    return data.filter(
        (item: any) =>
            item.type === "ST" &&
            item.lat !== undefined &&
            item.lon !== undefined &&
            item.products.length > 0 &&
            !(item.products.length === 1 && item.products[0] === "BUS")
    );
}

export async function getNearbyStation(lat: number, lon: number): Promise<string | null> {
    try {
        const {data, status} = await axios.get(
            `https://int.bahn.de/web/api/reiseloesung/orte/nearby?lat=${lat}&long=${lon}&radius=9999&maxNo=1`
        );

        if (status !== 200 || data.length === 0) {
            return null;
        }

        return data[0].name;
    } catch (error) {
        console.error("Error fetching nearby station:", error);
        return null;
    }
}