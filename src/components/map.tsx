'use client';
import {useTheme} from 'next-themes';
import {useEffect, useRef, useState} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function LibreMap({
                                     from, to, intermediateStops = [], legs = [], className, animationDuration = 2000,
                                 }: MapProps) {
    const {resolvedTheme} = useTheme();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<{
        start?: { marker: maplibregl.Marker; label?: HTMLElement };
        end?: { marker: maplibregl.Marker; label?: HTMLElement };
        intermediates: { marker: maplibregl.Marker; label?: HTMLElement }[];
    }>({
        intermediates: [],
    });
    const animationFrameRef = useRef<number | null>(null);
    const [mapInitialized, setMapInitialized] = useState(false);
    const [simplifiedStops, setSimplifiedStops] = useState<Coordinate[]>([]);

    const isDark = resolvedTheme === 'dark';
    const labelColor = '#000000';
    const haloColor = '#fff';

    useEffect(() => {
        if (!intermediateStops || intermediateStops.length === 0) {
            setSimplifiedStops(prev => prev.length === 0 ? prev : []);
            return;
        }

        const simplified: Coordinate[] = [];
        const MERGE_THRESHOLD = 50;

        for (let i = 0; i < intermediateStops.length; i++) {
            const current = intermediateStops[i];
            const next = intermediateStops[i + 1];

            if (next) {
                const distance = calculateDistance(current.lat, current.lon, next.lat, next.lon);

                if (distance < MERGE_THRESHOLD) {
                    const mergedStop: Coordinate = {
                        lat: (current.lat + next.lat) / 2,
                        lon: (current.lon + next.lon) / 2,
                        name: current.name || next.name
                    };
                    simplified.push(mergedStop);
                    i++;
                } else {
                    simplified.push(current);
                }
            } else {
                simplified.push(current);
            }
        }

        setSimplifiedStops(simplified);
    }, [intermediateStops]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            attributionControl: false,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [11.119065, 46.072438],
            zoom: 12,
            minZoom: 5,
            maxZoom: 19,

        });

        map.on('load', () => {
            map.addSource('route-source', {
                type: 'geojson', data: {
                    type: 'FeatureCollection', features: []
                }
            });

            setMapInitialized(true);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        const map = mapRef.current;
        const labelLayers = ['start-marker-label', 'end-marker-label', 'intermediate-stops-labels'];

        labelLayers.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.setPaintProperty(layerId, 'text-color', labelColor);
                map.setPaintProperty(layerId, 'text-halo-color', haloColor);
            }
        });

    }, [resolvedTheme, mapInitialized, isDark, labelColor, haloColor]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        if (markersRef.current.start) {
            markersRef.current.start.marker.remove();
            if (markersRef.current.start.label) {
                markersRef.current.start.label.remove();
            }
            markersRef.current.start = undefined;
        }

        if (from) {
            const map = mapRef.current;

            if (!map.getSource('start-marker')) {
                map.addSource('start-marker', {
                    type: 'geojson', data: {
                        type: 'Feature', properties: {name: from.name || 'Partenza'}, geometry: {
                            type: 'Point', coordinates: [from.lon, from.lat]
                        }
                    }
                });

                map.addLayer({
                    id: 'start-marker-circle', type: 'circle', source: 'start-marker', paint: {
                        'circle-radius': 8,
                        'circle-color': '#0171F8',
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#fff'
                    }
                });

                map.addLayer({
                    id: 'start-marker-label', type: 'symbol', source: 'start-marker', layout: {
                        'text-field': ['get', 'name'],
                        'text-font': ['Noto Sans Bold'],
                        'text-size': 16,
                        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
                        'text-radial-offset': 1,
                        'text-justify': 'auto'
                    }, paint: {
                        'text-color': labelColor
                    }
                });
            } else {
                (map.getSource('start-marker') as maplibregl.GeoJSONSource).setData({
                    type: 'Feature', properties: {name: from.name || 'Partenza'}, geometry: {
                        type: 'Point', coordinates: [from.lon, from.lat]
                    }
                });
            }
        }

        updateMapBounds();
    }, [from, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        if (markersRef.current.end) {
            markersRef.current.end.marker.remove();
            if (markersRef.current.end.label) {
                markersRef.current.end.label.remove();
            }
            markersRef.current.end = undefined;
        }

        if (to) {
            const map = mapRef.current;

            if (!map.getSource('end-marker')) {
                map.addSource('end-marker', {
                    type: 'geojson', data: {
                        type: 'Feature', properties: {name: to.name || 'Destinazione'}, geometry: {
                            type: 'Point', coordinates: [to.lon, to.lat]
                        }
                    }
                });

                map.addLayer({
                    id: 'end-marker-circle', type: 'circle', source: 'end-marker', paint: {
                        'circle-radius': 8,
                        'circle-color': '#0171F8',
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#fff'
                    }
                });

                map.addLayer({
                    id: 'end-marker-label', type: 'symbol', source: 'end-marker', layout: {
                        'text-field': ['get', 'name'],
                        'text-font': ['Noto Sans Bold'],
                        'text-size': 16,
                        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
                        'text-radial-offset': 1,
                        'text-justify': 'auto'
                    }, paint: {
                        'text-color': labelColor
                    }
                });
            } else {
                (map.getSource('end-marker') as maplibregl.GeoJSONSource).setData({
                    type: 'Feature', properties: {name: to.name || 'Destinazione'}, geometry: {
                        type: 'Point', coordinates: [to.lon, to.lat]
                    }
                });
            }
        }

        updateMapBounds();
    }, [to, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        markersRef.current.intermediates.forEach(({marker, label}) => {
            marker.remove();
            if (label) label.remove();
        });
        markersRef.current.intermediates = [];

        const map = mapRef.current;

        if (map.getLayer('intermediate-stops-circles')) {
            map.removeLayer('intermediate-stops-circles');
        }
        if (map.getLayer('intermediate-stops-labels')) {
            map.removeLayer('intermediate-stops-labels');
        }
        if (map.getSource('intermediate-stops')) {
            map.removeSource('intermediate-stops');
        }

        if (simplifiedStops && simplifiedStops.length > 0) {
            map.addSource('intermediate-stops', {
                type: 'geojson', data: {
                    type: 'FeatureCollection', features: simplifiedStops.map(stop => ({
                        type: 'Feature', properties: {name: stop.name || ''}, geometry: {
                            type: 'Point', coordinates: [stop.lon, stop.lat]
                        }
                    }))
                }
            });

            map.addLayer({
                id: 'intermediate-stops-circles', type: 'circle', source: 'intermediate-stops', paint: {
                    'circle-radius': 5,
                    'circle-color': '#007AFF',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                }
            });

            if (simplifiedStops.some(stop => stop.name)) {
                map.addLayer({
                    id: 'intermediate-stops-labels', type: 'symbol', source: 'intermediate-stops', layout: {
                        'text-field': ['get', 'name'],
                        'text-font': ['Noto Sans Regular'],
                        'text-size': 12,
                        'text-variable-anchor': ['left', 'right'],
                        'text-radial-offset': 1,
                        'text-justify': 'auto'
                    }, paint: {
                        'text-color': labelColor,

                    }
                });
            }
        }

        updateMapBounds();
    }, [simplifiedStops, mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        const map = mapRef.current;
        const existingLayers = map.getStyle().layers;
        existingLayers.forEach((layer) => {
            if (layer.id.startsWith('route-layer-')) {
                map.removeLayer(layer.id);
            }
        });

        Object.keys(map.getStyle().sources).forEach((sourceId) => {
            if (sourceId.startsWith('route-source-')) {
                map.removeSource(sourceId);
            }
        });

        if (legs.length === 0) {
            const source = map.getSource('route-source') as maplibregl.GeoJSONSource;
            if (source) {
                source.setData({
                    type: 'FeatureCollection', features: []
                });
            }
            return;
        }

        const startAnimation = async () => {
            try {
                const decodedLegs = await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));
                const totalPoints = decodedLegs.reduce((sum, leg) => sum + leg.length, 0);
                const legEndPoints: number[] = [];
                let cumulative = 0;
                decodedLegs.forEach(leg => {
                    cumulative += leg.length;
                    legEndPoints.push(cumulative);
                });

                decodedLegs.forEach((_, idx) => {
                    const legColor = legs[idx].mode === "WALK" ? "#999999" : legs[idx].routeColor ? `#${legs[idx].routeColor}` : "#036633";

                    map.addSource(`route-source-${idx}`, {
                        type: 'geojson', data: {
                            type: 'Feature', properties: {}, geometry: {
                                type: 'LineString', coordinates: []
                            }
                        }
                    });

                    const layers = map.getStyle().layers;
                    const markerLayer = layers.find(l => l.id.includes('intermediate-stops-circles') || l.id.includes('start-marker-circle') || l.id.includes('end-marker-circle'));
                    const beforeId = markerLayer?.id;

                    map.addLayer({
                        id: `route-layer-${idx}`, type: 'line', source: `route-source-${idx}`, layout: {
                            'line-join': 'round', 'line-cap': 'round'
                        }, paint: {
                            'line-color': legColor, 'line-width': 6, 'line-opacity': 0.9
                        }
                    }, beforeId);
                });

                const startTime = performance.now();

                const animate = (time: number) => {
                    const elapsed = time - startTime;
                    const progress = Math.min(elapsed / animationDuration, 1);
                    const currentTotalPoint = Math.floor(progress * totalPoints);

                    let pointsSoFar = 0;
                    decodedLegs.forEach((legPoints, idx) => {
                        const legStartPoint = pointsSoFar;
                        const legEndPoint = legEndPoints[idx];

                        if (currentTotalPoint >= legStartPoint) {
                            const pointsIntoThisLeg = Math.min(currentTotalPoint - legStartPoint, legPoints.length);

                            const coordinates = legPoints
                                .slice(0, pointsIntoThisLeg)
                                .map(p => [p[1], p[0]]);

                            const source = map.getSource(`route-source-${idx}`) as maplibregl.GeoJSONSource;
                            if (source) {
                                source.setData({
                                    type: 'Feature', properties: {}, geometry: {
                                        type: 'LineString', coordinates
                                    }
                                });
                            }
                        }

                        pointsSoFar = legEndPoint;
                    });

                    if (progress < 1) {
                        animationFrameRef.current = requestAnimationFrame(animate);
                    } else {
                        decodedLegs.forEach((legPoints, idx) => {
                            const coordinates = legPoints.map(p => [p[1], p[0]]);
                            const source = map.getSource(`route-source-${idx}`) as maplibregl.GeoJSONSource;
                            if (source) {
                                source.setData({
                                    type: 'Feature', properties: {}, geometry: {
                                        type: 'LineString', coordinates
                                    }
                                });
                            }
                        });
                        animationFrameRef.current = null;
                    }
                };

                animationFrameRef.current = requestAnimationFrame(animate);
                updateMapBounds();
            } catch (error) {
                console.error("Error animating legs:", error);
            }
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
        if (!mapRef.current) return;

        const allPoints: [number, number][] = [];

        if (from && !isNaN(from.lat) && !isNaN(from.lon)) {
            allPoints.push([from.lon, from.lat]);
        }
        if (to && !isNaN(to.lat) && !isNaN(to.lon)) {
            allPoints.push([to.lon, to.lat]);
        }

        if (legs.length > 0) {
            const decodedLegs = await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));
            decodedLegs.forEach(legPoints => {
                legPoints.forEach(p => {
                    const lat = Number(p[0]);
                    const lon = Number(p[1]);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        allPoints.push([lon, lat]);
                    }
                });
            });
        }

        if (simplifiedStops) {
            simplifiedStops.forEach(stop => {
                if (!isNaN(stop.lat) && !isNaN(stop.lon)) {
                    allPoints.push([stop.lon, stop.lat]);
                }
            });
        }

        if (allPoints.length > 0) {
            const bounds = allPoints.reduce((bounds, coord) => bounds.extend(coord as [number, number]), new maplibregl.LngLatBounds(allPoints[0], allPoints[0]));

            mapRef.current.fitBounds(bounds, {
                padding: 50, duration: 1000,
            });
        }
    };

    return (<div
        ref={mapContainerRef}
        style={{height: '300px', width: '100%'}}
        className={className}
    />);
}