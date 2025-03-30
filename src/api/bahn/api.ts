"use server";
import axios from "axios";

export async function searchStation(query: string) {
    const { data } = await axios.get(`https://int.bahn.de/web/api/reiseloesung/orte?suchbegriff=${query}&typ=ALL&limit=2`);
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