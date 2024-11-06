'use client';
import {Button, Flex, Loader} from "@mantine/core";
import {useState} from "react";
import {setCookie} from "@/api";

export function getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (typeof window !== "undefined" && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                (error) => {
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            reject(new Error("User denied the request for Geolocation."));
                            break;
                        case error.POSITION_UNAVAILABLE:
                            reject(new Error("Location information is unavailable."));
                            break;
                        case error.TIMEOUT:
                            reject(new Error("The request to get user location timed out."));
                            break;
                        default:
                            reject(new Error("An unknown error occurred."));
                            break;
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            console.error("Geolocation is not supported or running on the server");
            reject(new Error("Geolocation is not supported or running on the server"));
        }
    });
}

export default function Location() {
    const [loading, setLoading] = useState(false);

    const handleFetchStops = async () => {
        setLoading(true);
        try {
            const userLocation = await getUserLocation();
            await setCookie('lat', userLocation.lat);
            await setCookie('lon', userLocation.lon);
        } catch (error) {
            console.error("Failed to get location", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Flex justify="center" direction="column" gap="lg">
            <Button onClick={handleFetchStops} disabled={loading} radius={9999}>
                {loading ? "Fetching Location..." : "Grant Location Access"}
            </Button>
            {loading && <Loader />}
        </Flex>
    );
}