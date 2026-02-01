import axios from "axios";

export function createAxiosClient() {
    const client = axios.create({
        timeout: 15000
    });

    client.interceptors.response.use((response) => response, async (error) => {
        const config = error.config;

        if (!config.__retryCount) {
            config.__retryCount = 0;
        }

        const shouldRetry = config.__retryCount < 3 && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500 || !error.response);

        if (!shouldRetry) {
            return Promise.reject(error);
        }

        config.__retryCount += 1;

        const delay = Math.pow(2, config.__retryCount - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        return client(config);
    });

    return client;
}