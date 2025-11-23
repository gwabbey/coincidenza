'use client';
import {useTheme} from 'next-themes';
import {useEffect, useRef, useState} from 'react';
import 'leaflet/dist/leaflet.css';

interface Coordinate {
    lat: number;
    lon: number;
    name?: string;
}

interface Leg {
    legGeometry: { points: string };
    mode?: string;
    routeColor?: string;
}

interface MapProps {
    from?: Coordinate;
    to?: Coordinate;
    intermediateStops?: Coordinate[];
    legs?: Leg[];
    className?: string;
    animationDuration?: number;
}

async function decodePolyline(encoded: string): Promise<Array<[number, number]>> {
    const polyline = await import('@mapbox/polyline');
    return polyline.decode(encoded, 6) as Array<[number, number]>;
}

export default function AnimatedLeafletMap({
                                               from,
                                               to,
                                               intermediateStops = [],
                                               legs = [],
                                               className,
                                               animationDuration = 2000,
                                           }: MapProps) {
    const {theme} = useTheme();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markersRef = useRef<{
        start?: L.Marker; end?: L.Marker; intermediates: L.CircleMarker[];
    }>({
        intermediates: [],
    });
    const polylinesRef = useRef<L.Polyline[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
        import('leaflet').then((L) => {
            if (!mapRef.current || mapInstanceRef.current) return;

            mapInstanceRef.current = L.map(mapRef.current, {
                scrollWheelZoom: true, center: [46.072438, 11.119065], zoom: 12, zoomControl: false
            });

            setMapInitialized(true);
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            const currentCenter = mapInstanceRef.current!.getCenter();
            const currentZoom = mapInstanceRef.current!.getZoom();

            if (tileLayerRef.current) {
                mapInstanceRef.current!.removeLayer(tileLayerRef.current);
            }

            let resolvedTheme = theme;
            if (theme === 'system') {
                resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            tileLayerRef.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${resolvedTheme}_all/{z}/{x}/{y}{r}.png`, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapInstanceRef.current!);

            mapInstanceRef.current!.setView(currentCenter, currentZoom);
        });
    }, [theme, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            if (markersRef.current.start) {
                mapInstanceRef.current!.removeLayer(markersRef.current.start);
            }

            if (from) {
                markersRef.current.start = L.marker([from.lat, from.lon])
                    .addTo(mapInstanceRef.current!)
                    .bindTooltip(from.name || 'Partenza', {
                        permanent: true, className: 'leaflet-tooltip',
                    });
            }

            updateMapBounds();
        });
    }, [from, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            if (markersRef.current.end) {
                mapInstanceRef.current!.removeLayer(markersRef.current.end);
            }

            if (to) {
                markersRef.current.end = L.marker([to.lat, to.lon])
                    .addTo(mapInstanceRef.current!)
                    .bindTooltip(to.name || 'Destinazione', {
                        permanent: true, className: 'leaflet-tooltip',
                    });
            }

            updateMapBounds();
        });
    }, [to, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            markersRef.current.intermediates.forEach((marker) => {
                mapInstanceRef.current!.removeLayer(marker);
            });
            markersRef.current.intermediates = [];

            if (intermediateStops && intermediateStops.length > 0) {
                intermediateStops.forEach((stop) => {
                    const circleMarker = L.circleMarker([stop.lat, stop.lon], {
                        radius: 4, fillColor: 'white', color: 'blue', weight: 1, opacity: 1, fillOpacity: 1,
                    })
                        .addTo(mapInstanceRef.current!);

                    markersRef.current.intermediates.push(circleMarker);
                });
            }

            updateMapBounds();
        });
    }, [intermediateStops, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current) return;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        polylinesRef.current.forEach((polyline) => {
            mapInstanceRef.current!.removeLayer(polyline);
        });
        polylinesRef.current = [];

        if (legs.length === 0) return;

        const startAnimation = async () => {
            import("leaflet").then(async (L) => {
                try {
                    const decodedLegs = await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));

                    const legIndices = legs.map(() => 0);

                    decodedLegs.forEach((_, idx) => {
                        const legColor = legs[idx].mode === "WALK" ? "#999999" : `#${legs[idx].routeColor || "016FED"}`;

                        const polyline = L.polyline([], {color: legColor, weight: 6, opacity: 0.9})
                            .addTo(mapInstanceRef.current!);

                        polylinesRef.current.push(polyline);
                    });

                    const startTime = performance.now();

                    const animate = (time: number) => {
                        const elapsed = time - startTime;
                        const progress = Math.min(elapsed / animationDuration, 1);

                        decodedLegs.forEach((legPoints, idx) => {
                            const targetIndex = Math.floor(progress * legPoints.length);
                            if (targetIndex > legIndices[idx]) {
                                const newPoints = legPoints.slice(legIndices[idx], targetIndex)
                                    .map(p => L.latLng(p[0], p[1]));

                                const currentPoints = polylinesRef.current[idx].getLatLngs() as L.LatLng[];
                                polylinesRef.current[idx].setLatLngs([...currentPoints, ...newPoints]);

                                legIndices[idx] = targetIndex;
                            }
                        });

                        if (progress < 1) {
                            animationFrameRef.current = requestAnimationFrame(animate);
                        } else {
                            decodedLegs.forEach((legPoints, idx) => {
                                polylinesRef.current[idx].setLatLngs(legPoints.map(p => L.latLng(p[0], p[1])));
                            });
                            animationFrameRef.current = null;
                        }
                    };

                    animationFrameRef.current = requestAnimationFrame(animate);
                    updateMapBounds();
                } catch (error) {
                    console.error("Error animating legs:", error);
                }
            });
        };

        startAnimation();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [legs, mapInitialized, animationDuration]);

    const updateMapBounds = async () => {
        if (!mapInstanceRef.current) return;

        import('leaflet').then(async (L) => {
            const allPoints: L.LatLngTuple[] = [];

            if (from) allPoints.push([from.lat, from.lon]);
            if (to) allPoints.push([to.lat, to.lon]);

            if (legs.length > 0) {
                const decodedLegs = await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));
                decodedLegs.forEach(legPoints => {
                    allPoints.push(...(legPoints as L.LatLngTuple[]));
                });
            }

            if (intermediateStops) {
                intermediateStops.forEach((stop) => {
                    allPoints.push([stop.lat, stop.lon]);
                });
            }

            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                mapInstanceRef.current!.fitBounds(bounds, {
                    padding: [50, 50], animate: true, duration: 1,
                });
            }
        });
    };

    return (<div
        ref={mapRef}
        style={{height: '400px', width: '100%'}}
        className={className}
    />);
}