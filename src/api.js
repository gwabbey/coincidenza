"use server";
import {cookies} from "next/headers";
import * as cheerio from 'cheerio';
import axios from "axios";
import {HttpsProxyAgent} from "https-proxy-agent";

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

export async function searchLocation(query) {
    let url = new URL("https://photon.komoot.io/api/");
    url.searchParams.append("q", query);
    url.searchParams.append("limit", "10");

    if (!query) {
        return [];
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Fetch error: ${response.status}`);
    }

    return await response.json();
}

export async function reverseGeocode(lat, lon) {
    let url = new URL("https://photon.komoot.io/reverse/");
    url.searchParams.append("lat", lat);
    url.searchParams.append("lon", lon);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Fetch error: ${response.status}`);
    }

    return await response.json();
}

export async function getCookie(name) {
    return (await cookies()).get(name);
}

export async function setCookie(name, value, options = {}) {
    const {maxAge = 7 * 24 * 60 * 60, path = '/', secure = false, sameSite = 'Strict'} = options;

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

const responseCache = new Map();

export async function fetchData(endpoint, options = {}) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    const TIMEOUT = 5000;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const cacheKey = getCacheKey(endpoint, options.params);

    const isValidResponse = (data) => {
        if (data === null || data === undefined) return false;
        return !(Array.isArray(data) && data.length === 0);

    };

    function getCacheKey(endpoint, params) {
        if (!params) return endpoint;
        return `${endpoint}-${JSON.stringify(params)}`;
    }

    async function attemptFetch(retryCount = 0) {
        try {
            let url = `https://app-tpl.tndigit.it/gtlservice/${endpoint}`;

            if (options.params) {
                const searchParams = new URLSearchParams(options.params);
                url += `?${searchParams.toString()}`;
            }

            const proxyAgent = new HttpsProxyAgent(process.env.PROXY_AGENT);

            const response = await axios.get(url, {
                httpsAgent: proxyAgent,
                timeout: TIMEOUT,
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "it.tndigit.mit",
                    Authorization: `Basic ${btoa(
                        `${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`
                    )}`,
                },
            });

            if (isValidResponse(response.data)) {
                responseCache.set(cacheKey, response.data);
                return response.data;
            }

            if (responseCache.has(cacheKey)) {
                console.warn(`Received invalid response, using cached data for ${endpoint}`, {
                    retryCount
                });
                return responseCache.get(cacheKey);
            }

            if (retryCount < MAX_RETRIES) {
                console.warn(`Received invalid response, retrying (attempt ${retryCount + 1})...`, {
                    endpoint,
                    retryCount: retryCount + 1
                });
                await sleep(RETRY_DELAY * (retryCount + 1));
                return attemptFetch(retryCount + 1);
            }

            throw new Error('Failed to get valid response after all retries');

        } catch (error) {
            if (responseCache.has(cacheKey)) {
                console.warn(`Request failed, using cached data for ${endpoint}`, {
                    error: error.message
                });
                return responseCache.get(cacheKey);
            }

            const retryableErrors = [
                'ECONNRESET',
                'ETIMEDOUT',
                'ECONNABORTED',
                'ENETUNREACH',
                'ECONNREFUSED',
                'EPIPE',
            ];

            const shouldRetry = (
                retryCount < MAX_RETRIES &&
                (error.code && retryableErrors.includes(error.code) ||
                    error.response?.status >= 500 ||
                    error.code === 'ECONNABORTED' ||
                    !error.response)
            );

            if (shouldRetry) {
                console.warn(`Attempt ${retryCount + 1} failed, retrying in ${RETRY_DELAY}ms...`, {
                    error: error.message,
                    endpoint,
                    retryCount: retryCount + 1
                });

                await sleep(RETRY_DELAY * (retryCount + 1));
                return attemptFetch(retryCount + 1);
            }

            console.error('Request failed after all retry attempts with no cached data', {
                error: error.message,
                endpoint,
                retryCount
            });
            throw error;
        }
    }

    if (responseCache.has(cacheKey)) {
        attemptFetch().catch(error => {
            console.warn('Background fetch failed', {
                error: error.message,
                endpoint
            });
        });

        return responseCache.get(cacheKey);
    }

    return attemptFetch();
}

export async function getClosestBusStops(userLat, userLon, type = '') {
    try {
        const params = {
            lat: userLat,
            lon: userLon,
        };

        if (type) {
            params.type = type;
        }

        const busStops = await fetchData('stops', {
            params,
        });

        const stopsWithDistance = busStops.map(
            (stop) => {
                const distance = getDistance(
                    userLat,
                    userLon,
                    stop.stopLat,
                    stop.stopLon
                );
                return {
                    ...stop,
                    distance,
                };
            }
        );

        stopsWithDistance.sort((a, b) => a.distance - b.distance);

        return stopsWithDistance;
    } catch (error) {
        console.error("Error fetching stops:", error);
        return null;
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
        console.error("Error fetching stops:", error);
        return [];
    }
}

export async function getStop(id, type) {
    try {
        const params = {
            type: type,
            stopId: id,
            limit: 15,
            refDateTime: new Date().toISOString(),
        };

        const stops = await fetchData('trips_new', {
            params
        });

        const groupedStops = stops.reduce((acc, current) => {
            const {routeId} = current;

            if (!acc[routeId]) {
                acc[routeId] = [];
            }

            acc[routeId].push(current);
            return acc;
        }, {});

        const routeData = await fetchData('routes', {
            params: {
                type: type,
            },
        });

        const results = Object.keys(groupedStops).map((routeId) => {
            const details = routeData.find(route => route.routeId === parseInt(routeId, 10)) || null;

            if (!details) return null;

            return {
                id: routeId,
                stops: groupedStops[routeId],
                details,
            };
        }).filter(result => result !== null && result.details !== null);

        return results.sort((a, b) => a.details.routeShortName.localeCompare(b.details.routeShortName, 'it', {numeric: true}));

    } catch (error) {
        console.error("Error fetching stop:", error);
        return [];
    }
}

export async function getTrip(id) {
    try {
        const trip = await fetchData(`trips/${id}`);
        const stops = await fetchData('stops', {
            params: {
                type: trip.type
            }
        });
        const routes = await fetchData('routes', {
            params: {
                type: trip.type
            }
        });

        const stopNameLookup = stops.reduce((acc, stop) => {
            acc[stop.stopId] = stop.stopName;
            return acc;
        }, {});

        const updatedStopTimes = trip.stopTimes.map(stopTime => ({
            ...stopTime,
            stopName: stopNameLookup[stopTime.stopId] || 'Fermata sconosciuta'
        }));

        const routeDetails = routes.find(route => route.routeId === trip.routeId);

        return {
            ...trip,
            stopTimes: updatedStopTimes,
            route: routeDetails || null
        };
    } catch (error) {
        console.error("Error fetching trip:", error);
        return null;
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

        return {trains, alerts};
    } catch (error) {
        console.error("Error fetching stop:", error);
        return null;
    }
}