import axios from "axios";
import axiosRetry from "axios-retry";

export function createAxiosClient() {
    const client = axios.create({
        timeout: 10000
    });

    axiosRetry(client, {
        retries: 5, retryDelay: axiosRetry.exponentialDelay, retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
        }, onRetry: (retryCount, error) => {
            console.warn(`Retry attempt ${retryCount} for error: ${error.response?.statusText || error.message}`);
        }
    });

    return client;
}