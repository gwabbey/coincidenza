import { createResponse, Session } from "better-sse";
import crypto from 'crypto';
import { NextRequest } from "next/server";

const globalHashCache = new Map<string, { hash: string, timestamp: number }>();
const CACHE_TTL = 60000;

const cleanupCache = () => {
    const now = Date.now();
    for (const [key, value] of globalHashCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            globalHashCache.delete(key);
        }
    }
};

export interface SSEConfig<T> {
    fetchData: (id: string) => Promise<T | null>;
    formatForClient: (data: T) => any;
    shouldStopUpdates?: (data: T) => boolean;
    getCompletionMessage?: (data: T) => string;
    errorMessages?: {
        notFound?: string;
        tooManyErrors?: string;
        temporaryError?: string;
    };
    polling?: {
        baseInterval?: number;
        minInterval?: number;
        maxInterval?: number;
        dynamicAdjustment?: boolean;
    };
    errorHandling?: {
        maxConsecutiveErrors?: number;
        maxTotalErrors?: number;
        backoffMultiplier?: number;
    };
}

export async function createSSEHandler<T>(
    request: NextRequest,
    id: string,
    config: SSEConfig<T>
) {
    const {
        fetchData,
        formatForClient,
        shouldStopUpdates = () => false,
        errorMessages = {},
    } = config;

    const pollingConfig = {
        baseInterval: 15000,
        minInterval: 5000,
        maxInterval: 60000,
        dynamicAdjustment: true,
    };

    const errorConfig = {
        maxConsecutiveErrors: 10,
        maxTotalErrors: 50,
        backoffMultiplier: 2,
    };

    const messages = {
        notFound: "Data not found",
        tooManyErrors: "Too many consecutive errors, stopping updates",
        temporaryError: "Temporary error fetching data",
        ...errorMessages
    };

    return createResponse(request, async (session: Session) => {
        const state = {
            lastHash: "",
            consecutiveErrors: 0,
            totalErrors: 0,
            intervalId: null as NodeJS.Timeout | null,
            isUpdating: false,
            dynamicInterval: pollingConfig.baseInterval,
            lastUpdateTime: 0,
            lastActivityTime: Date.now()
        };

        const hashData = (data: T): string => {
            const dataString = JSON.stringify(data);
            const cacheKey = `${id}_${crypto.createHash('md5').update(dataString).digest('hex').substring(0, 8)}`;

            const cached = globalHashCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return cached.hash;
            }

            const hash = crypto.createHash('md5').update(dataString).digest('hex');
            globalHashCache.set(cacheKey, { hash, timestamp: Date.now() });
            return hash;
        };

        const cleanup = () => {
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }
            state.isUpdating = false;
        };

        const pushData = (data: any): boolean => {
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

        const adjustPollingInterval = (hasChanges: boolean) => {
            if (!pollingConfig.dynamicAdjustment) return;

            const now = Date.now();

            if (hasChanges) {
                state.lastActivityTime = now;
                state.dynamicInterval = Math.max(
                    pollingConfig.minInterval,
                    state.dynamicInterval * 0.9
                );
            } else {
                const timeSinceActivity = now - state.lastActivityTime;

                if (timeSinceActivity > 300000) {
                    state.dynamicInterval = Math.min(
                        pollingConfig.maxInterval,
                        state.dynamicInterval * 1.1
                    );
                }
            }

            if (state.intervalId && Math.abs(state.dynamicInterval - pollingConfig.baseInterval) > 2000) {
                clearInterval(state.intervalId);
                state.intervalId = setInterval(updateData, state.dynamicInterval);
            }
        };

        const updateData = async () => {
            if (!session.isConnected || state.isUpdating) {
                return;
            }

            state.isUpdating = true;

            try {
                const data = await fetchData(id);

                if (!data) {
                    pushData({ type: 'error', message: messages.notFound });
                    cleanup();
                    return;
                }

                if (shouldStopUpdates(data)) {
                    cleanup();
                    return;
                }

                const currentHash = hashData(data);
                const hasChanges = currentHash !== state.lastHash;

                if (hasChanges) {
                    state.lastHash = currentHash;
                    state.consecutiveErrors = 0;
                    state.lastUpdateTime = Date.now();

                    adjustPollingInterval(true);

                    const success = pushData({
                        ...formatForClient(data),
                        type: 'data_update',
                        timestamp: Date.now()
                    });

                    if (!success) {
                        cleanup();
                        return;
                    }
                } else {
                    adjustPollingInterval(false);
                }

            } catch (error) {
                state.consecutiveErrors++;
                state.totalErrors++;
                console.error(`Error fetching data for ${id}:`, error);

                if (state.consecutiveErrors > 3) {
                    state.dynamicInterval = Math.min(
                        pollingConfig.maxInterval,
                        state.dynamicInterval * errorConfig.backoffMultiplier
                    );

                    if (state.intervalId) {
                        clearInterval(state.intervalId);
                        state.intervalId = setInterval(updateData, state.dynamicInterval);
                    }
                }

                if (state.consecutiveErrors > errorConfig.maxConsecutiveErrors ||
                    state.totalErrors > errorConfig.maxTotalErrors) {
                    pushData({
                        type: 'error',
                        message: messages.tooManyErrors
                    });
                    cleanup();
                    return;
                }

                if (state.consecutiveErrors % 3 === 1) {
                    pushData({
                        type: 'warning',
                        message: `${messages.temporaryError} (attempt ${state.consecutiveErrors})`,
                        retryable: true
                    });
                }

            } finally {
                state.isUpdating = false;
            }
        };

        const cacheCleanupInterval = setInterval(cleanupCache, CACHE_TTL);
        state.intervalId = setInterval(updateData, state.dynamicInterval);

        const enhancedCleanup = () => {
            cleanup();
            clearInterval(cacheCleanupInterval);
        };

        session.addListener('disconnected', enhancedCleanup);
        request.signal.addEventListener('abort', enhancedCleanup);

        updateData();
    });
}