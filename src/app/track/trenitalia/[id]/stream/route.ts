import { getTrip } from "@/api/trenitalia/api";
import { createResponse, Session } from "better-sse";
import crypto from 'crypto';
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;

    return createResponse(request, async (session: Session) => {
        const state = {
            lastTripHash: "",
            consecutiveErrors: 0,
            intervalId: null as NodeJS.Timeout | null
        };

        const hashTrip = (trip: any) =>
            crypto.createHash('md5').update(JSON.stringify({
                status: trip.status,
                delay: trip.delay,
                lastKnownLocation: trip.lastKnownLocation,
                lastUpdate: trip.lastUpdate,
                currentStopIndex: trip.currentStopIndex,
                stops: trip.stops.map((stop: any) => ({
                    id: stop.id,
                    name: stop.name,
                    scheduledPlatform: stop.scheduledPlatform,
                    actualPlatform: stop.actualPlatform,
                    scheduledArrival: stop.scheduledArrival,
                    actualArrival: stop.actualArrival,
                    scheduledDeparture: stop.scheduledDeparture,
                    actualDeparture: stop.actualDeparture,
                    departureDelay: stop.departureDelay,
                    arrivalDelay: stop.arrivalDelay,
                    status: stop.status
                }))
            })).digest('hex');

        const cleanup = () => {
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }
        };

        const pushSafe = (data: any) => {
            if (!session.isConnected) {
                cleanup();
                return false;
            }

            try {
                session.push(data);
                return true;
            } catch (error) {
                console.error('Failed to push data:', error);
                cleanup();
                return false;
            }
        };

        const handleTripUpdate = async () => {
            if (!session.isConnected) {
                cleanup();
                return;
            }

            try {
                const trip = await getTrip(id);

                if (!trip) {
                    pushSafe({ error: "Trip not found" });
                    cleanup();
                    return;
                }

                if (trip.status === "completed" || trip.status === "canceled") {
                    pushSafe({
                        data: trip,
                        message: 'Trip completed, stopping updates'
                    });
                    cleanup();
                    return;
                }

                const currentHash = hashTrip(trip);

                if (currentHash !== state.lastTripHash) {
                    state.lastTripHash = currentHash;
                    state.consecutiveErrors = 0;

                    const success = pushSafe({
                        status: trip.status,
                        delay: trip.delay,
                        lastKnownLocation: trip.lastKnownLocation,
                        currentStopIndex: trip.currentStopIndex,
                        lastUpdate: trip.lastUpdate,
                        stops: trip.stops,
                        timestamp: Date.now()
                    });

                    if (!success) cleanup();
                }

            } catch (error) {
                state.consecutiveErrors++;
                console.error('Error fetching trip:', error);

                if (state.consecutiveErrors > 5) {
                    pushSafe({
                        type: 'error',
                        message: 'Too many errors, stopping updates'
                    });
                    cleanup();
                    return;
                }

                if (session.isConnected) {
                    pushSafe({
                        message: 'Failed to fetch trip data',
                        retryable: true
                    });
                }
            }
        };

        session.addListener('disconnected', cleanup);
        request.signal.addEventListener('abort', cleanup);

        state.intervalId = setInterval(handleTripUpdate, 15000);

        handleTripUpdate();
    });
}