import { NextRequest } from "next/server";

// Generic type for the data fetcher function
export type DataFetcher<T, P = string> = (params: P) => Promise<T | null>;

// Generic type for the data transformer function
export type DataTransformer<T, R> = (data: T) => R;

// Configuration options for the SSE handler
export interface SSEConfig<T, R, P = string> {
    /** Function to fetch the data */
    dataFetcher: DataFetcher<T, P>;
    /** Function to transform the fetched data before sending */
    dataTransformer: DataTransformer<T, R>;
    /** Interval in milliseconds between updates (default: 10000) */
    intervalMs?: number;
    /** Custom error message for when data is not found */
    notFoundMessage?: string;
    /** Custom error message for fetch failures */
    fetchErrorMessage?: string;
    /** Additional headers to include in the response */
    additionalHeaders?: Record<string, string>;
}

/**
 * Creates a Server-Sent Events (SSE) route handler
 * @param config Configuration object for the SSE handler
 * @returns A function that can be used as a GET route handler
 */
export function createSSEHandler<T, R, P = string>(
    config: SSEConfig<T, R, P>
) {
    const {
        dataFetcher,
        dataTransformer,
        intervalMs = 10000,
        notFoundMessage = "Data not found",
        fetchErrorMessage = "Failed to fetch data",
        additionalHeaders = {}
    } = config;

    return async function GET(
        request: NextRequest,
        { params }: { params: Promise<{ id: string }> }
    ) {
        const id = (await params).id;

        const responseHeaders = new Headers({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
            ...additionalHeaders
        });

        const encoder = new TextEncoder();
        let intervalId: NodeJS.Timeout;

        const stream = new ReadableStream({
            start(controller) {
                const sendUpdate = async () => {
                    try {
                        const data = await dataFetcher(id as P);

                        if (!data) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ error: notFoundMessage })}\n\n`)
                            );
                            return;
                        }

                        const transformedData = dataTransformer(data);
                        const updateData = {
                            ...transformedData,
                            timestamp: new Date().toISOString()
                        };

                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(updateData)}\n\n`)
                        );
                    } catch (error) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: fetchErrorMessage })}\n\n`)
                        );
                    }
                };

                // Send initial update
                sendUpdate();

                // Set up interval for subsequent updates
                intervalId = setInterval(sendUpdate, intervalMs);

                // Handle client disconnect
                request.signal.addEventListener('abort', () => {
                    clearInterval(intervalId);
                    controller.close();
                });
            },
            cancel() {
                clearInterval(intervalId);
            }
        });

        return new Response(stream, { headers: responseHeaders });
    };
}