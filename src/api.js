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

export async function fetchData(endpoint, options = {}) {
    let url = `https://app-tpl.tndigit.it/gtlservice/${endpoint}`;

    if (options.params) {
        const searchParams = new URLSearchParams(options.params);
        url += `?${searchParams.toString()}`;
    }

    const proxyAgent = new HttpsProxyAgent(process.env.PROXY_AGENT);

    const response = await axios.get(url, {
        httpsAgent: proxyAgent,
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "it.tndigit.mit",
            Authorization: `Basic ${btoa(
                `${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`
            )}`,
        },
    });

    console.log('status: ', response.status);
    console.log('status text: ', response.statusText);

    return await response.data;
}

export async function getClosestBusStops(userLat, userLon, type = '') {
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
}

export async function getRoute(type, routeId, limit, directionId, refDateTime) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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
}

export async function getStop(id, type) {
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
}

export async function getTrip(id) {
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