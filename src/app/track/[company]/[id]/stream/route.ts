import {getTrip as getTrenitaliaTrip} from "@/api/trenitalia/api";
import {getTrip as getTrentinoTrip, getTripDetails} from "@/api/trentino-trasporti/api";
import {NormalizedTrip, trenitaliaAdapter, trentinoAdapter} from "@/adapters";
import {createResponse} from "better-sse";
import crypto from 'crypto';
import {NextRequest} from "next/server";

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ company: string, id: string }> }
) {
    const {company, id} = await params;
    const origin = request.nextUrl.searchParams.get('origin');
    const timestampStr = request.nextUrl.searchParams.get('timestamp');
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : undefined;

    const isTrainCompany = company === "trenitalia" || company === "trenord";
    if (isTrainCompany && (!origin || !timestamp)) {
        return new Response(
            JSON.stringify({error: "Viaggiatreno requires origin station and timestamp"}),
            {status: 400, headers: {'Content-Type': 'application/json'}}
        );
    }

    return createResponse(request, async (session) => {
        let lastHash = "";
        let stopTimes: any[] = [];

        if (company === "trentino-trasporti") {
            const details = await getTripDetails(id);
            stopTimes = details.stopTimes;
        }

        const sendUpdate = async () => {
            let normalizedTrip: NormalizedTrip;

            try {
                switch (company) {
                    case "trenitalia":
                    case "trenord":
                        if (!origin || timestamp === undefined) {
                            session.push({error: "Viaggiatreno requires origin station and timestamp"});
                            return true;
                        }
                        const trenitaliaTrip = await getTrenitaliaTrip(origin, id, timestamp);
                        normalizedTrip = trenitaliaAdapter(trenitaliaTrip);
                        break;

                    case "trentino-trasporti":
                        const trentinoTrip = await getTrentinoTrip(id);
                        if (!trentinoTrip) {
                            session.push({error: "Trip not found"});
                            return true;
                        }
                        normalizedTrip = trentinoAdapter(trentinoTrip, stopTimes);
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
                    session.push({error: "Failed to fetch trip data"});
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