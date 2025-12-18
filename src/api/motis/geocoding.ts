"use server"
import axios from "axios";
import {capitalize} from "@/utils";

const MOTIS = process.env.MOTIS || "http://localhost:8080";

export interface SearchResult {
    type: string
    category: string
    tokens: number[][]
    name: string
    id: string
    lat: number
    lon: number
    country: string
    zip: string
    tz: string
    areas: Area[]
    score: number
    level?: number
    modes: string[]
    importance?: number
}

export interface Area {
    name: string
    adminLevel: number
    matched: boolean
    unique: boolean
    default: boolean
}

export interface Location {
    id: string
    type: string
    category: string
    name: string
    lat: number
    lon: number
    area: string
    modes: string[]
}

function cleanup(data: SearchResult[]): Location[] {
    const seen = new Set<string>();

    return data
        .map((item) => {
            const hasRail = item.modes?.some(m => m.includes("RAIL")) ?? false;
            const _key = `${item.lat}-${item.lon}-${item.id}`;
            const defaultArea = item.areas?.find(a => a.default);
            const matchedArea = item.areas?.find(a => a.matched && a.name !== defaultArea?.name);

            return {
                _key,
                id: item.id,
                type: item.type,
                modes: item.modes,
                category: item.category,
                name: capitalize(item.name),
                lat: item.lat,
                lon: item.lon,
                area: hasRail ? "Stazione" : [defaultArea?.name ?? "", matchedArea?.name ?? ""]
                    .filter(Boolean)
                    .map(name => name.replaceAll(" - ", "-"))
                    .join(", ")
            };
        })
        .filter(item => {
            if (seen.has(item._key) || !item.name) return false;
            seen.add(item._key);
            return true;
        })
        .sort((a, b) => {
            const aHasRail = a.modes?.some(m => m.includes("RAIL")) ?? false;
            const bHasRail = b.modes?.some(m => m.includes("RAIL")) ?? false;
            return Number(bHasRail) - Number(aHasRail);
        });
}

export async function searchLocation({lat, lon, query}: {
    lat: string
    lon: string
    query: string
}): Promise<Location[]> {
    const isInvalid = isNaN(+lat) || isNaN(+lon)
    const {data} = await axios.get<SearchResult[]>(`${MOTIS}/api/v1/geocode?place=46.0722416,11.1193186&text=${query}&language=it`);
    console.log(`${MOTIS}/api/v1/geocode?place=${isInvalid ? "46.0722416" : lat},${isInvalid ? "11.1193186" : lon}&text=${query}&language=it`)
    return cleanup(data);
}

export async function reverseGeocode(lat: string, lon: string): Promise<Location[]> {
    const isInvalid = isNaN(+lat) || isNaN(+lon)
    const {data} = await axios.get<SearchResult[]>(`${MOTIS}/api/v1/reverse-geocode?place=${isInvalid ? "46.0722416" : lat},${isInvalid ? "11.1193186" : lon}`);

    return cleanup(data);
}