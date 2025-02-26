'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import polyline from '@mapbox/polyline';
import { useTheme } from "next-themes";
import { Leg } from '@/app/directions/types';

export default function LeafletMap({
    leg,
    className,
}: {
    leg: Leg,
    className?: string,
}) {
    const { theme } = useTheme();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        if (typeof window !== 'undefined') {
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
            });
        }

        const decodedPath: L.LatLngTuple[] = polyline.decode(leg.points).map(([lat, lon]) => [lat, lon] as L.LatLngTuple);
        const startPoint = decodedPath[0];
        const endPoint = decodedPath[decodedPath.length - 1];

        mapInstanceRef.current = L.map(mapRef.current).fitBounds(decodedPath);

        tileLayerRef.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${theme}_all/{z}/{x}/{y}{r}.png`, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current);

        L.polyline(decodedPath, { color: 'blue' }).addTo(mapInstanceRef.current);

        const startMarker = L.marker(startPoint).addTo(mapInstanceRef.current);
        startMarker.bindPopup(leg.fromPlace.name, {
            className: 'quay-label',
        });

        const endMarker = L.marker(endPoint).addTo(mapInstanceRef.current);
        endMarker.bindPopup(leg.toPlace.name, {
            className: 'quay-label',
        });

        leg.intermediateQuays.forEach((quay) => {
            const circleMarker = L.circleMarker([quay.latitude, quay.longitude], {
                radius: 6,
                fillColor: 'white',
                color: 'blue',
                weight: 1,
                opacity: 1,
                fillOpacity: 1,
            }).addTo(mapInstanceRef.current!);

            circleMarker.bindPopup(quay.name, {
                className: 'quay-label',
            });
        });

        setMapInitialized(true);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                tileLayerRef.current = null;
            }
        };
    }, [leg]);

    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current || !tileLayerRef.current) return;

        const currentCenter = mapInstanceRef.current.getCenter();
        const currentZoom = mapInstanceRef.current.getZoom();

        mapInstanceRef.current.removeLayer(tileLayerRef.current);

        tileLayerRef.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${theme}_all/{z}/{x}/{y}{r}.png`, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.setView(currentCenter, currentZoom);
    }, [theme, mapInitialized]);

    return <div ref={mapRef} style={{ height: '400px', width: '100%' }} className={className} />;
}
