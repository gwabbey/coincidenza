'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LeafletMap({ decodedPath }: { decodedPath: [number, number][] }) {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        const map = L.map(mapRef.current).fitBounds(decodedPath);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        L.polyline(decodedPath, { color: 'blue' }).addTo(map);

        return () => {
            map.remove();
        };
    }, [decodedPath]);

    return <div ref={mapRef} style={{ height: '400px', width: '100%' }} />;
}