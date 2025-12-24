"use server";

import {getCachedMapsToken} from './auth';
import {getDistance} from "@/utils";
import {createAxiosClient} from "@/api/axios";

const axios = createAxiosClient();

export async function searchLocation(address: string, options?: {
    limitToCountries?: string
    lang?: string
    searchLocation?: string
    searchRegion?: string
    userLocation?: string
}) {
    const token = await getCachedMapsToken();

    const params: Record<string, string> = {
        q: address, resultTypeFilter: "poi",
    };

    if (options?.limitToCountries) params.limitToCountries = options.limitToCountries;
    if (options?.searchRegion) params.searchRegion = options.searchRegion;
    if (options?.searchLocation) params.searchLocation = options.searchLocation;
    if (options?.userLocation) params.userLocation = options.userLocation;

    const {data} = await axios.get("https://maps-api.apple.com/v1/search", {
        headers: {Authorization: `Bearer ${token}`}, params,
    });

    const results = data.results.map((a: any) => {
        const lat = a.coordinate.latitude;
        const lon = a.coordinate.longitude;

        return {
            id: a.id || `${lat.toFixed(6)},${lon.toFixed(6)}`,
            name: a.name,
            address: a.formattedAddressLines?.join(", ") ?? "",
            category: a.poiCategory ?? "Location",
            lat,
            lon,
        };
    });

    const deduped: typeof results = [];

    for (const item of results) {
        if (item.category !== "PublicTransport") {
            deduped.push(item);
            continue;
        }

        const alreadyExists = deduped.some((existing: any) => existing.category === "PublicTransport" && getDistance(existing.lat, existing.lon, item.lat, item.lon) <= 200);

        if (!alreadyExists) {
            deduped.push(item);
        }
    }

    return deduped;
}

export async function reverseGeocode(latitude: number, longitude: number) {
    const token = await getCachedMapsToken();
    const response = await axios.get('https://maps-api.apple.com/v1/reverseGeocode', {
        headers: {
            Authorization: `Bearer ${token}`,
        }, params: {loc: `${latitude},${longitude}`, lang: 'it-IT'}
    });
    return response.data;
}