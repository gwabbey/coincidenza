import axios from "axios";
import axiosRetry from "axios-retry";

export function createAxiosClient() {
    const client = axios.create({
        timeout: 15000
    });

    axiosRetry(client, {
        retries: 5, retryDelay: axiosRetry.exponentialDelay, retryCondition: (error) => {
            if (error.code === 'ECONNABORTED') {
                return true;
            }

            return axiosRetry.isNetworkOrIdempotentRequestError(error);
        }, onRetry: (retryCount, error) => {
            console.warn(`Retry attempt ${retryCount} for error: ${error.code} - ${error.message}`);
        }
    });

    return client;
}