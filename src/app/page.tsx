'use client';
import {useEffect, useState} from 'react';
import {Select, Text} from '@mantine/core';
import {getClosestBusStops} from "@/api";

export default function HomePage() {
    const [busStops, setBusStops] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const requestLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    setError(null);
                    const stops = await getClosestBusStops(position.coords.latitude, position.coords.longitude);
                    setBusStops(stops);
                    setIsLoading(false);
                },
                (err) => {
                    setError('Please enable location services and allow access.');
                    setIsLoading(false);
                    // Keep asking the user until they enable location
                    setTimeout(() => {
                        requestLocation();
                    }, 3000);
                }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        requestLocation();
    }, []);

    return (
        <div style={{padding: '20px', textAlign: 'center'}}>
            <h1>Find the Closest Bus Stops</h1>
            {error && <Text c="red">{error}</Text>}
            {isLoading ? (
                <Text>Loading bus stops...</Text>
            ) : (
                <Select
                    placeholder="Select a bus stop"
                    data={busStops.map((stop) => ({
                        value: stop.id.toString(),
                        label: `${stop.name} (${stop.distance.toFixed(1)}m away)`,
                    }))}
                    style={{maxWidth: 300, margin: '0 auto'}}
                    nothingFoundMessage="No bus stops found"
                />
            )}
        </div>
    );
}