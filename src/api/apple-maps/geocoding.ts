'use server';
import axios from 'axios';

/**
 * Generates a geocoding request.
 * @param address - The address to geocode (e.g., "1 Apple Park, Cupertino, CA").
 * @param token - A valid Apple Maps JWT token.
 * @param options - Optional parameters for geocoding.
 */
export async function geocodeAddress(
    address: string,
    token: string,
    options?: {
        limitToCountries?: string; // e.g., "US,CA"
        lang?: string; // e.g., "en-US"
        searchLocation?: string; // e.g., "37.78,-122.42"
        searchRegion?: string; // e.g., "38,-122.1,37.5,-122.5"
        userLocation?: string; // e.g., "37.78,-122.42"
    }
) {
    const params: Record<string, string> = { q: address };
    if (options?.limitToCountries) params.limitToCountries = options.limitToCountries;
    if (options?.lang) params.lang = options.lang;
    if (options?.searchLocation) params.searchLocation = options.searchLocation;
    if (options?.searchRegion) params.searchRegion = options.searchRegion;
    if (options?.userLocation) params.userLocation = options.userLocation;

    const response = await axios.get('https://maps-api.apple.com/v1/searchAutocomplete', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params
    });

    return response.data;
}

export async function reverseGeocode(latitude: number, longitude: number, token: string) {
    const response = await axios.get('https://maps-api.apple.com/v1/reverseGeocode', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: { loc: `${latitude},${longitude}`, lang: 'it-IT' }
    });
    return response.data;
}