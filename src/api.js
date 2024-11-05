"use server";
import {cookies} from "next/headers";

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

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "it.tndigit.mit",
            Authorization: `Basic ${btoa(
                `${process.env.TT_USERNAME}:${process.env.TT_PASSWORD}`
            )}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`Fetch error: ${response.status}`);
    }

    return await response.json();
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
        return [];
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
        return {
            trips: [],
            details: {},
        };
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
            params,
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