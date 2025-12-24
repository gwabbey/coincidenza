import axios from "axios";
import axiosRetry from "axios-retry";

export function createAxiosClient() {
    const client = axios.create({
        timeout: 15000,
    });

    axiosRetry(client, {
        retries: 3,
        onRetry: (retryCount, error) => {
            console.warn(
                `retry attempt ${retryCount} for error ${error.response?.statusText}`
            );
        },
    });

    return client;
}