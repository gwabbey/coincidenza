import {createResponse, Session} from "better-sse";
import crypto from "crypto";
import {NextRequest} from "next/server";

export async function createSSEHandler<T>(
    request: NextRequest,
    origin: string | null,
    id: string,
    timestamp: number | undefined,
    {
        fetchData,
        formatForClient,
        shouldStopUpdates = () => false,
        interval = 15000,
        minInterval = 5000,
        maxInterval = 60000,
    }: {
        fetchData: (origin: string | null, id: string, ts: number | undefined) => Promise<T | null>;
        formatForClient: (data: T) => any;
        shouldStopUpdates?: (data: T) => boolean;
        interval?: number;
        minInterval?: number;
        maxInterval?: number;
    }
) {
    return createResponse(request, async (session: Session) => {
        let lastHash = "";
        let currentInterval = interval;
        let timer: NodeJS.Timeout | null = null;

        const hash = (d: T) =>
            crypto.createHash("md5").update(JSON.stringify(d)).digest("hex");

        const cleanup = () => {
            if (timer) clearInterval(timer);
            timer = null;
        };

        const update = async () => {
            try {
                const data = await fetchData(origin, id, timestamp);
                if (!data) return;

                if (shouldStopUpdates(data)) return cleanup();

                const newHash = hash(data);
                if (newHash !== lastHash) {
                    lastHash = newHash;
                    session.push({type: "data_update", ...formatForClient(data)});

                    // speed up polling when fresh updates arrive
                    currentInterval = Math.max(minInterval, Math.floor(currentInterval * 0.8));
                    restart();
                }
            } catch {
                // slow down on error
                currentInterval = Math.min(maxInterval, currentInterval * 2);
                restart();
            }
        };

        const restart = () => {
            if (timer) clearInterval(timer);
            timer = setInterval(update, currentInterval);
        };

        session.addListener("disconnected", cleanup);
        request.signal.addEventListener("abort", cleanup);

        restart();
    });
}