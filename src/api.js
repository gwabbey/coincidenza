"use server";
import { cookies } from "next/headers";

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