import {getTrip as getTrenitaliaTrip} from "@/api/trenitalia/api";
import {getTrip as getTrentinoTrip} from "@/api/trentino-trasporti/api";
import {getTrip as getItaloTrip} from "@/api/italo/api";
import {createResponse} from "better-sse";
import crypto from 'crypto';
import {NextRequest} from "next/server";
import {getTrip as getCiceroTrip} from "@/api/cicero/api";

export async function GET(request: NextRequest, {params}: { params: Promise<{ company: string, id: string }> }) {
    const {company, id} = await params;
    const origin = request.nextUrl.searchParams.get('origin');
    const timestampStr = request.nextUrl.searchParams.get('timestamp');
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : undefined;

    const isTrainCompany = company === "trenitalia" || company === "trenord";
    if (isTrainCompany && (!origin || !timestamp)) {
        return new Response(JSON.stringify({error: "Viaggiatreno requires origin station and timestamp"}), {
            status: 400, headers: {'Content-Type': 'application/json'}
        });
    }

    return createResponse(request, async (session) => {
        let lastHash = "";

        const sendUpdate = async () => {
            let normalizedTrip;

            try {
                let missingCount = 0;
                switch (company) {
                    case "trenitalia":
                    case "trenord":
                        if (!origin || timestamp === undefined) {
                            session.push({error: "Viaggiatreno requires origin station and timestamp"});
                            return true;
                        }
                        const trenitaliaTrip = await getTrenitaliaTrip(origin, id, timestamp);

                        if (!trenitaliaTrip) {
                            missingCount++;
                            if (missingCount > 3) {
                                session.push({error: "Trip not found"});
                                return true;
                            }
                            return false;
                        }

                        missingCount = 0;

                        normalizedTrip = {
                            status: trenitaliaTrip.status,
                            delay: trenitaliaTrip.delay,
                            lastKnownLocation: trenitaliaTrip.lastKnownLocation,
                            lastUpdate: trenitaliaTrip.lastUpdate,
                            currentStopIndex: trenitaliaTrip.currentStopIndex,
                            stops: trenitaliaTrip.stops.map((stop: any) => ({
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
                        }
                        break;

                    case "italo":
                        const italoTrip = await getItaloTrip(id);

                        if (!italoTrip) {
                            missingCount++;
                            if (missingCount > 3) {
                                session.push({error: "Trip not found"});
                                return true;
                            }
                            return false;
                        }

                        missingCount = 0;

                        normalizedTrip = {
                            status: italoTrip.status,
                            delay: italoTrip.delay,
                            lastKnownLocation: italoTrip.lastKnownLocation,
                            lastUpdate: italoTrip.lastUpdate,
                            currentStopIndex: italoTrip.currentStopIndex,
                            stops: italoTrip.stops.map((stop: any) => ({
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
                        }
                        break;

                    case "trentino-trasporti":
                        const trentinoTrip = await getTrentinoTrip(id);

                        if (!trentinoTrip) {
                            missingCount++;
                            if (missingCount > 3) {
                                session.push({error: "Trip not found"});
                                return true;
                            }
                            return false;
                        }

                        missingCount = 0;
                        normalizedTrip = {
                            status: trentinoTrip.status,
                            delay: trentinoTrip.delay,
                            lastUpdate: trentinoTrip.lastUpdate,
                            currentStopIndex: trentinoTrip.currentStopIndex,
                        };
                        break;

                    case "atv":
                        const ciceroTrip = await getCiceroTrip("ATV", id, new Date().toISOString());

                        if (!ciceroTrip) {
                            missingCount++;
                            if (missingCount > 3) {
                                session.push({error: "Trip not found"});
                                return true;
                            }
                            return false;
                        }

                        missingCount = 0;
                        normalizedTrip = {
                            status: ciceroTrip.status,
                            delay: ciceroTrip.delay,
                            lastUpdate: ciceroTrip.lastUpdate,
                            currentStopIndex: ciceroTrip.currentStopIndex,
                        };
                        break;

                    default:
                        session.push({error: "Unknown company"});
                        return true;
                }

                if (normalizedTrip.status === "completed" || normalizedTrip.status === "canceled") {
                    session.push(normalizedTrip);
                    return true;
                }

                const currentHash = crypto.createHash('md5')
                    .update(JSON.stringify(normalizedTrip))
                    .digest('hex');

                if (currentHash !== lastHash && session.isConnected) {
                    lastHash = currentHash;
                    session.push(normalizedTrip);
                }

                return false;
            } catch (error) {
                if (session.isConnected) {
                    session.push({error: `Error: ${error}`});
                }
                return true;
            }
        };

        if (await sendUpdate()) return;

        const intervalId = setInterval(async () => {
            if (await sendUpdate()) {
                clearInterval(intervalId);
            }
        }, 10000);

        request.signal.addEventListener('abort', () => {
            clearInterval(intervalId);
        });
    });
}