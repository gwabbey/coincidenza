import { getTrip } from "@/api/trentino-trasporti/api";
import { createResponse } from "better-sse";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;

    return createResponse(request, async (session) => {
        const sendUpdate = async () => {
            const trip = await getTrip(id);

            if (!trip) {
                session.push({ error: "Trip not found" });
                return;
            }

            session.push({
                tripId: trip.id,
                delay: trip.delay,
                stopLast: trip.stopLast,
                lastEventRecivedAt: trip.lastEventRecivedAt,
                lastSequenceDetection: trip.lastSequenceDetection,
                matricolaBus: trip.matricolaBus,
                timestamp: new Date().toISOString()
            });
        };

        await sendUpdate();
        const intervalId = setInterval(sendUpdate, 10000);

        request.signal.addEventListener('abort', () => {
            clearInterval(intervalId);
        });
    });
}