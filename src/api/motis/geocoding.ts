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
    category: string
    name: string
    lat: number
    lon: number
    address: string
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
                address: hasRail ? "Stazione" : [defaultArea?.name ?? "", matchedArea?.name ?? ""]
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

export async function searchLocation(query: string): Promise<Location[]> {
    const {data} = await axios.get<SearchResult[]>(`${MOTIS}/api/v1/geocode?place=46.0722416,11.1193186&text=${query}&type=STOP`);

    const seen = new Set<string>();

    return data
        .map((item) => {
            const hasRail = item.modes?.some(m => m.includes("RAIL")) ?? false;

            return {
                id: item.id,
                category: item.category,
                name: capitalize(item.name),
                lat: item.lat,
                lon: item.lon,
                address: hasRail ? "Stazione" : item.areas.find((a) => a.default)?.name ?? "",
            };
        })
        .filter((item) => {
            if (item.id.startsWith("trenitalia") || item.id.startsWith("gab") || item.id.startsWith("sta") || item.id.startsWith("trenord")) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);

            return true;
        });
}

export async function getStop(id: string) {
    try {
        const {
            data, status
        } = await axios.get(`${MOTIS}/api/v5/stoptimes?stopId=${id}&n=0&exactRadius=false&radius=200`);
        if (status === 200) return {
            id: data.place.stopId, name: data.place.name, lat: data.place.lat.toString(), lon: data.place.lon.toString()
        }
    } catch (error) {
        return null;
    }
}

export async function reverseGeocode(lat: string, lon: string): Promise<Location[]> {
    const isInvalid = isNaN(+lat) || isNaN(+lon)
    const {data} = await axios.get<SearchResult[]>(`${MOTIS}/api/v1/reverse-geocode?place=${isInvalid ? "46.0722416" : lat},${isInvalid ? "11.1193186" : lon}`);

    return cleanup(data);
}