import {getTrip, getTripDetails} from "@/api/trentino-trasporti/api";
import {createResponse} from "better-sse";
import crypto from 'crypto';
import {NextRequest} from "next/server";

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;
    const {stopTimes} = await getTripDetails(id);

    return createResponse(request, async (session) => {
        let lastTripHash = "";

        const hashObject = (obj: any) =>
            crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');

        const sendUpdate = async () => {
            const trip = await getTrip(id);

            if (!trip) {
                session.push({error: "Trip not found"});
                return true;
            }

            if (trip.lastSequenceDetection === stopTimes.length) {
                return true;
            }

            const currentTripData = {
                delay: trip.delay,
                stopLast: trip.stopLast,
                lastEventRecivedAt: trip.lastEventRecivedAt,
                lastSequenceDetection: trip.lastSequenceDetection,
            };

            const currentHash = hashObject(currentTripData);

            if (currentHash !== lastTripHash && session.isConnected) {
                lastTripHash = currentHash;
                session.push(currentTripData);
            }

            return false;
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