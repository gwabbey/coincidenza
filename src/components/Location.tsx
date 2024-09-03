'use client';
import { Button, Flex, Loader } from "@mantine/core";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (typeof window !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                (error) => {
                    reject(error);
                }
            );
        } else {
            reject(new Error("Geolocation is not supported or running on the server"));
        }
    });
}

export default function Location() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleFetchStops = async () => {
        setLoading(true);
        try {
            const userLocation = await getUserLocation();
            router.push(`/stops?lat=${userLocation.lat}&lon=${userLocation.lon}`);
        } catch (error) {
            console.error("Failed to get location", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Flex justify="center" direction="column" gap="lg">
            <Button onClick={handleFetchStops}>
                Grant Location Access
            </Button>
            {loading && <Loader />}
        </Flex>
    );
}