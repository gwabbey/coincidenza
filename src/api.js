"use server";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { cookies } from "next/headers";
import { trainCategoryShortNames } from "./mappings";
import stops from "./stops.json";

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

export async function fetchData(endpoint, options = {}) {
    let url = `https://app-tpl.tndigit.it/gtlservice/${endpoint}`;

    if (options.params) {
        const searchParams = new URLSearchParams(options.params);
        url += `?${searchParams.toString()}`;
    }

    const httpsAgent = new HttpsProxyAgent(process.env.PROXY_AGENT);

    const client = axios.create({
        httpsAgent,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "it.tndigit.mit",
            Authorization: `Basic ${Buffer.from(
                `${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`
            ).toString("base64")}`
        }
    });

    axiosRetry(client, {
        retries: 5,
        retryDelay: axiosRetry.exponentialDelay,
        onRetry: (retryCount, error) => {
            console.error(`Retry attempt ${retryCount} for error ${error.response?.statusText}`);
        }
    });

    try {
        const response = await client.get(url);
        return response.data;
    } catch (error) {
        throw new Error(`Trentino trasporti data fetch error: ${error.message}`);
    }
}

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

export async function getRoutes(type) {
    if (!type) {
        return await fetchData('routes');
    }

    return await fetchData('routes', {
        params: {
            type
        }
    });
}

export async function getStops(type) {
    if (!type) {
        return await fetchData('stops');
    }

    return await fetchData('stops', {
        params: {
            type
        }
    });
}

export async function getStopTrips(id, type, routes) {
    try {
        const trips = await fetchData('trips_new', {
            params: {
                type,
                stopId: id,
                limit: 15,
                refDateTime: new Date().toISOString(),
            },
        });

        const routeMap = new Map(
            routes.map((route) => [Number(route.routeId), route])
        );

        const routeGroups = new Map();
        const uniqueTrips = new Set();

        for (const trip of trips || []) {
            const routeId = Number(trip.routeId);
            const routeDetails = routeMap.get(routeId);

            if (routeDetails && !uniqueTrips.has(trip.tripId)) {
                uniqueTrips.add(trip.tripId);

                if (!routeGroups.has(routeId)) {
                    routeGroups.set(routeId, {
                        id: routeId,
                        trips: [trip],
                        details: routeDetails,
                    });
                } else {
                    routeGroups.get(routeId).trips.push(trip);
                }
            }
        }

        const response = {
            stopId: id,
            type,
            routes: Array.from(routeGroups.values()).sort((a, b) =>
                a.details.routeShortName.localeCompare(b.details.routeShortName, 'it', { numeric: true })
            ),
        };

        return response;
    } catch (error) {
        console.error(`Error in getStopTrips: ${error.message}`);
        throw new Error(`Failed to fetch stop data: ${error.message}`);
    }
}

export async function getTrip(id, type) {
    try {
        const trip = await fetchData(`trips/${id}`);

        const stopMap = new Map(
            stops.filter(stop => stop.type === type).map(stop => [stop.stopId, stop.stopName])
        );

        return {
            ...trip,
            stopTimes: trip.stopTimes.map(stopTime => ({
                ...stopTime,
                stopName: stopMap.get(stopTime.stopId) || 'Fermata sconosciuta'
            })),
        };
    } catch (error) {
        return null;
    }
}

export async function getStationMonitor(id) {
    try {
        const client = axios.create();

        axiosRetry(client, {
            retries: 5,
            retryDelay: axiosRetry.exponentialDelay,
            onRetry: (retryCount, error) => {
                console.error(`Retry attempt ${retryCount} for error ${error.response?.statusText}`);
            }
        });

        const response = await client.get(`https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${id}&arrivals=False`);
        const $ = cheerio.load(response.data);

        const trains = [];
        const alerts = $('#barraInfoStazioneId > div').find('div[class="marqueeinfosupp"] div').text();

        $('#bodyTabId > tr').each((index, element) => {
            const category = $(element).find('td[id="RCategoria"] img').attr('alt')?.replace('Categoria ', '').replace('CIVITAVECCHIA EXPRESS ', '').toLowerCase().trim();
            const number = $(element).find('td[id="RTreno"]').text().trim();
            const destination = $(element).find('td[id="RStazione"] div').text()?.toLowerCase().trim();
            const departureTime = $(element).find('td[id="ROrario"]').text().trim();
            const delay = $(element).find('td[id="RRitardo"]').text().trim() || '0';
            const platform = category === "autocorsa" ? "Piazzale Ferrovia" : $(element).find('td[id="RBinario"] div').text().trim();
            const departing = $(element).find('td[id="RExLampeggio"] img').attr('alt')?.toLowerCase().trim() === "si";

            const getShortCategory = (category) => {
                if (!category) return null;

                if (category.startsWith('suburbano')) {
                    return category.split(' ')[1];
                }

                if (category.startsWith('servizio ferroviario metropolitano')) {
                    return category.replace('servizio ferroviario metropolitano linea', 'SFM');
                }

                if (category === 'treno storico') {
                    return 'TS';
                }

                return trainCategoryShortNames[category] || null;
            };

            const shortCategory = getShortCategory(category);

            let company = $(element).find('td[id="RVettore"] img').attr('alt')?.toLowerCase().trim();
            const getCompany = (company) => {
                if (!company) return null;

                if (company === 'ente volturno autonomo') {
                    return 'EAV';
                }

                if (company === 'sad - trasporto locale spa') {
                    return 'SAD';
                }

                if (company.startsWith('obb')) {
                    return 'OBB';
                }

                return company;
            };

            company = getCompany(company);

            if (!id) {
                return;
            }

            if (number && destination && departureTime) {
                trains.push({
                    company,
                    category,
                    shortCategory,
                    number,
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
        return { trains: [], alerts: [], error: "Errore nel recupero dei dati" };
    }
}

export async function getDirections(from, to, time, details) {
    if (!from || !to || !time) {
        return null;
    }

    const directions = await fetchData('direction', {
        params: { from, to, refDateTime: time }
    });

    directions.routes = await Promise.all(directions.routes.map(async (route) => {
        route.legs[0].steps = await Promise.all(route.legs[0].steps.map(async (step) => {
            if (!step.transitDetails) {
                return step;
            }

            for (const agency of step.transitDetails.line.agencies) {
                if (agency.name !== "Trentino trasporti esercizio S.p.A.") {
                    return step;
                }
            }

            const isUrban = step.transitDetails?.line?.shortName?.length < 4;

            const routeId = details.find((detailRoute) =>
                detailRoute.routeLongName === step.transitDetails.line.name
            )?.routeId;

            if (!routeId) {
                return step;
            }

            if (!step.transitDetails.tripId) {
                return step;
            }

            const trip = await getTrip(step.transitDetails.tripId, isUrban ? 'U' : 'E');

            return {
                ...step,
                routeId,
                trip,
            };
        }));

        return route;
    }));

    return directions;
};


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