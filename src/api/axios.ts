import axios from "axios";
import axiosRetry from "axios-retry";

export function createAxiosClient() {
    const client = axios.create({
        timeout: 5000
    });

    axiosRetry(client, {
        retries: 5, onRetry: (retryCount, error) => {
            console.warn(`retry attempt ${retryCount} for error ${error.response?.statusText}`);
        }
    });

    return client;
}