"use server";
import { cookies } from "next/headers";
import * as cheerio from 'cheerio';
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function getCookie(name) {
    return (await cookies()).get(name)?.value;
}

export async function setCookie(name, value, options = {}) {
    const { maxAge = 7 * 24 * 60 * 60, path = '/', secure = false, sameSite = 'Strict' } = options;

    (await cookies()).set({
        name,
        value,
        maxAge,
        path,
        secure,
        sameSite,
        httpOnly: true,
    });
}

export async function searchLocation(query) {
    let url = new URL("https://photon.komoot.io/api/");
    url.searchParams.append("q", query);
    url.searchParams.append("limit", "10");

    if (!query) {
        return [];
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Fetch error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error in searchLocation: ${error.message}`);
        throw error;
    }
}

export async function reverseGeocode(lat, lon) {
    let url = new URL("https://photon.komoot.io/reverse/");
    url.searchParams.append("lat", lat);
    url.searchParams.append("lon", lon);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Fetch error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error in reverseGeocode: ${error.message}`);
        throw error;
    }
}

export async function fetchData(endpoint, options = {}) {
    let url = `https://app-tpl.tndigit.it/gtlservice/${endpoint}`;

    if (options.params) {
        const searchParams = new URLSearchParams(options.params);
        url += `?${searchParams.toString()}`;
        console.log(url);
    }

    const proxyAgent = new HttpsProxyAgent(process.env.PROXY_AGENT);

    const fetchWithRetry = async (retries = 3) => {
        try {
            const response = await axios.get(url, {
                httpsAgent: proxyAgent,
                timeout: 10000,
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "it.tndigit.mit",
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`
                    ).toString("base64")}`,
                    ...options.headers
                }
            });
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED' && retries > 0) {
                return fetchWithRetry(retries - 1);
            }
            console.error(`Error in fetchData: ${error.message}`);
            throw new Error("trentino trasporti data fetch error: ", error.message);
        }
    };

    return fetchWithRetry(1);
}

import stops from "./stops.json";

export async function getClosestBusStops(userLat, userLon) {
    try {
        const stopsWithDistance = stops.map(stop => ({
            ...stop,
            distance: getDistance(userLat, userLon, stop.stopLat, stop.stopLon),
        }));

        const sortedStops = stopsWithDistance.sort((a, b) => a.distance - b.distance);

        return sortedStops;
    } catch (error) {
        console.error(`Error in getClosestBusStops: ${error.message}`);
        throw new Error("closest stops fetch error: " + error.message);
    }
}

export async function getStop(id, type) {
    if (!id || !type) throw new Error('Missing required parameters');

    try {
        const [stops, routeData] = await Promise.all([
            fetchData('trips_new', {
                params: {
                    type,
                    stopId: id,
                    limit: 15,
                    refDateTime: new Date().toISOString(),
                }
            }),
            fetchData('routes', { params: { type } })
        ]);

        if (!Array.isArray(stops) || !Array.isArray(routeData)) {
            throw new Error('Invalid response format');
        }

        const routeMap = new Map(routeData.map(route => [parseInt(route.routeId, 10), route]));
        const routeGroups = stops.reduce((groups, stop) => {
            const routeId = parseInt(stop.routeId, 10);
            const routeDetails = routeMap.get(routeId);

            if (routeDetails) {
                if (!groups.has(routeId)) {
                    groups.set(routeId, { id: routeId, stops: [stop], details: routeDetails });
                } else {
                    groups.get(routeId).stops.push(stop);
                }
            }
            return groups;
        }, new Map());

        return Array.from(routeGroups.values()).sort((a, b) =>
            a.details.routeShortName.localeCompare(b.details.routeShortName, 'it', { numeric: true })
        );

    } catch (error) {
        console.error(`Error in getStop: ${error.message}`);
        throw new Error(`stop fetch error: ${error.message}`);
    }
}

export async function getTrip(id, type) {
    try {
        const [trip, routes] = await Promise.all([
            fetchData(`trips/${id}`),
            fetchData('routes', { params: { type } })
        ]);

        const stopMap = new Map(stops.map(stop => [stop.stopId, stop.stopName]));
        const routeDetails = routes.find(route => route.routeId === trip.routeId) || null;

        return {
            ...trip,
            stopTimes: trip.stopTimes.map(stopTime => ({
                ...stopTime,
                stopName: stopMap.get(stopTime.stopId) || 'Fermata sconosciuta'
            })),
            route: routeDetails
        };
    } catch (error) {
        console.error(`Error in getTrip: ${error.message}`);
        throw new Error("trip fetch error: " + error.message);
    }
}

export async function getStationMonitor(id) {
    try {
        const response = await fetch(`https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${id}&arrivals=False`);
        const $ = cheerio.load(await response.text());

        const trains = [];
        const alerts = $('#barraInfoStazioneId > div').find('div[class="marqueeinfosupp"] div').text();

        $('#bodyTabId > tr').each((index, element) => {
            const company = $(element).find('td[id="RVettore"] img').attr('alt');
            const category = $(element).find('td[id="RCategoria"] img').attr('src');
            const trainNumber = $(element).find('td[id="RTreno"]').text().trim();
            const destination = $(element).find('td[id="RStazione"] div').text().trim();
            const departureTime = $(element).find('td[id="ROrario"]').text().trim();
            const delay = $(element).find('td[id="RRitardo"]').text().trim() || 'Nessuno';
            const platform = $(element).find('td[id="RBinario"] div').text().trim();
            const departing = $(element).find('td[id="RExLampeggio"] img').length > 0;

            if (!id) {
                return;
            }

            if (trainNumber && destination && departureTime) {
                trains.push({
                    company,
                    category,
                    trainNumber,
                    destination,
                    departureTime,
                    delay,
                    platform,
                    departing,
                });
            }
        });

        return { trains, alerts };
    } catch (error) {
        console.error(`Error in getStationMonitor: ${error.message}`);
        throw new Error("monitor fetch error: ", error.message);
    }
}

export async function getRoute(type, routeId, limit, directionId, refDateTime) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
        const params = {
            type,
            routeId,
            limit,
            directionId,
            refDateTime,
        };

        let details;

        if (type === 'E') {
            details = await fetch(`https://www.trentinotrasporti.it/api/extraurbano/linee/${routeId}`).then(response => response.json());
        } else {
            details = await fetch(`https://www.trentinotrasporti.it/api/urbano/linee/${routeId}`).then(response => response.json());
        }

        const trips = await fetchData('trips_new', {
            params,
        });

        return {
            trips: trips,
            details: details,
        };

    } catch (error) {
        console.error(`Error in getRoute: ${error.message}`);
        throw new Error("Error fetching route:", error);
    }
}