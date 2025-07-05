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
        let lastTripHash = "";
        let consecutiveErrors = 0;
        let intervalId: NodeJS.Timeout | null = null;

        const hashObject = (obj: any) =>
            crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');

        const cleanup = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const safePush = (data: any): boolean => {
            if (!session.isConnected) {
                console.log('Session no longer active or connected, skipping push');
                cleanup();
                return false;
            }

            try {
                session.push(data);
                return true;
            } catch (error) {
                console.error('Error pushing data to session (likely disconnected):', error);
                cleanup();
                return false;
            }
        };

        const sendUpdate = async (): Promise<boolean> => {
            if (!session.isConnected) {
                return true;
            }

            try {
                const trip = await getTrip(id);

                if (!trip) {
                    safePush({ error: "Trip not found" });
                    return true;
                }

                if (trip.status === "completed" || trip.status === "canceled") {
                    safePush({
                        data: trip,
                        message: 'Trip completed, stopping updates'
                    });
                    return true;
                }

                const currentTripData = {
                    status: trip.status,
                    delay: trip.delay,
                    lastKnownLocation: trip.lastKnownLocation,
                    lastUpdate: trip.lastUpdate,
                    currentStopIndex: trip.currentStopIndex,
                    stopUpdates: trip.stops.map(stop => ({
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
                };

                const currentHash = hashObject(currentTripData);
                const hasChanged = !lastTripHash || lastTripHash !== currentHash;

                if (hasChanged) {
                    lastTripHash = currentHash;
                    consecutiveErrors = 0;

                    const success = safePush({
                        status: trip.status,
                        delay: trip.delay,
                        lastKnownLocation: trip.lastKnownLocation,
                        currentStopIndex: trip.currentStopIndex,
                        lastUpdate: trip.lastUpdate,
                        stops: trip.stops.map(stop => ({
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
                        })),
                        timestamp: Date.now()
                    });

                    if (!success) {
                        return true;
                    }
                }

                return false;
            } catch (error) {
                consecutiveErrors++;
                console.error('Error fetching trip data:', error);

                if (consecutiveErrors > 5) {
                    safePush({
                        type: 'error',
                        message: 'Too many consecutive errors, stopping updates'
                    });
                    cleanup();
                    return true;
                }

                if (session.isConnected) {
                    safePush({
                        message: 'Failed to fetch trip data',
                        retryable: true
                    });
                }
                return false;
            }
        };

        session.addListener('disconnected', () => {
            console.log('Session disconnected');
            cleanup();
        });

        request.signal.addEventListener('abort', () => {
            console.log('Request aborted');
            cleanup();
        });

        setInterval(async () => {
            if (!session.isConnected) {
                cleanup();
                return;
            }
            if (await sendUpdate()) {
                cleanup();
            }
        }, 15000);
    });
}