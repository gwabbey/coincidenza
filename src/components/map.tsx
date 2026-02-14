'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

let polylineDecoder: any = null;

async function decodePolyline(encoded: string): Promise<Array<[number, number]>> {
    if (!polylineDecoder) {
        polylineDecoder = await import('@mapbox/polyline');
    }
    return polylineDecoder.decode(encoded, 6) as Array<[number, number]>;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
}

function findClosestPointOnPolyline(targetLat: number, targetLon: number, polylinePoints: Array<[number, number]>): {
    lat: number; lon: number
} {
    let minDistance = Infinity;
    let closestPoint = {lat: targetLat, lon: targetLon};

    for (const [lat, lon] of polylinePoints) {
        const distance = getDistance(targetLat, targetLon, lat, lon);
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = {lat, lon};
        }
    }

    return closestPoint;
}

export default function LibreMap({
                                     from, to, intermediateStops = [], legs = [], className, animationDuration = 2000,
                                 }: MapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<{
        start?: { marker: maplibregl.Marker; label?: HTMLElement };
        end?: { marker: maplibregl.Marker; label?: HTMLElement };
        intermediates: { marker: maplibregl.Marker; label?: HTMLElement }[];
    }>({intermediates: []});
    const animationFrameRef = useRef<number | null>(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    const decodedLegs = useMemo(async () => {
        if (!legs.length) return [];
        try {
            return await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));
        } catch (error) {
            console.error("Error decoding polyline:", error);
            return [];
        }
    }, [legs]);

    const snappedStops = useMemo(async () => {
        if (!intermediateStops.length) return [];

        const decoded = await decodedLegs;
        if (!decoded.length) return intermediateStops;

        return intermediateStops.map((stop) => {
            let closestLegIndex = -1;
            let minDistance = Infinity;

            decoded.forEach((legPoints, legIndex) => {
                if (legs[legIndex]?.mode === "WALK") return;

                legPoints.forEach(([lat, lon]) => {
                    const distance = getDistance(stop.lat, stop.lon, lat, lon);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestLegIndex = legIndex;
                    }
                });
            });

            if (closestLegIndex !== -1) {
                const transitLegPoints = decoded[closestLegIndex];
                const closestPoint = findClosestPointOnPolyline(stop.lat, stop.lon, transitLegPoints);
                return {...closestPoint, name: stop.name};
            }

            return stop;
        });
    }, [intermediateStops, decodedLegs, legs]);

    const updateMapBounds = useCallback(async () => {
        if (!mapRef.current) return;

        const allPoints: [number, number][] = [];

        if (from && !isNaN(from.lat) && !isNaN(from.lon)) {
            allPoints.push([from.lon, from.lat]);
        }
        if (to && !isNaN(to.lat) && !isNaN(to.lon)) {
            allPoints.push([to.lon, to.lat]);
        }

        const decoded = await decodedLegs;
        decoded.forEach(legPoints => {
            legPoints.forEach(([lat, lon]) => {
                if (!isNaN(lat) && !isNaN(lon)) {
                    allPoints.push([lon, lat]);
                }
            });
        });

        const snapped = await snappedStops;
        snapped.forEach(stop => {
            if (!isNaN(stop.lat) && !isNaN(stop.lon)) {
                allPoints.push([stop.lon, stop.lat]);
            }
        });

        if (allPoints.length > 0) {
            const bounds = allPoints.reduce((bounds, coord) => bounds.extend(coord), new maplibregl.LngLatBounds(allPoints[0], allPoints[0]));

            mapRef.current.fitBounds(bounds, {
                padding: 50, duration: 1000,
            });
        }
    }, [from, to, decodedLegs, snappedStops]);

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
                type: 'geojson', data: {type: 'FeatureCollection', features: []}
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
                map.setPaintProperty(layerId, 'text-color', "#000000");
                map.setPaintProperty(layerId, 'text-halo-color', "#fff");
            }
        });
    }, [mapInitialized, "#000000", "#fff"]);

    useEffect(() => {
        if (!mapInitialized) return;
        updateMapBounds();
    }, [mapInitialized, from?.lat, from?.lon, to?.lat, to?.lon, updateMapBounds]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        const map = mapRef.current;
        markersRef.current.intermediates.forEach(({marker}) => marker.remove());
        markersRef.current.intermediates = [];

        if (!map.getSource('start-marker')) {
            map.addSource('start-marker', {
                type: 'geojson', data: {type: 'FeatureCollection', features: []}
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
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-radial-offset': 1.2,
                    'text-justify': 'auto',
                    'symbol-placement': 'point',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'symbol-z-order': 'auto'
                }, paint: {
                    'text-color': "#000000", 'text-halo-color': "#fff", 'text-halo-width': 2, 'text-halo-blur': 1
                }
            });
        }

        if (!map.getSource('end-marker')) {
            map.addSource('end-marker', {
                type: 'geojson', data: {type: 'FeatureCollection', features: []}
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
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-radial-offset': 1.2,
                    'text-justify': 'auto',
                    'symbol-placement': 'point',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'symbol-z-order': 'auto'
                }, paint: {
                    'text-color': "#000000", 'text-halo-color': "#fff", 'text-halo-width': 2, 'text-halo-blur': 1
                }
            });
        }

        if (!map.getSource('intermediate-stops')) {
            map.addSource('intermediate-stops', {
                type: 'geojson', data: {type: 'FeatureCollection', features: []}
            });

            map.addLayer({
                id: 'intermediate-stops-circles', type: 'circle', source: 'intermediate-stops', paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 12, 4, 14, 5, 16, 7],
                    'circle-color': ['get', 'color'],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                }
            });

            map.addLayer({
                id: 'intermediate-stops-labels', type: 'symbol', source: 'intermediate-stops', layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 12,
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
                    'text-radial-offset': 1.0,
                    'text-justify': 'auto',
                    'symbol-placement': 'point',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'text-optional': false,
                    'icon-allow-overlap': false,
                    'icon-ignore-placement': false,
                    'symbol-avoid-edges': true,
                    'text-padding': 2,
                    'symbol-sort-key': ['get', 'priority'],
                    'symbol-z-order': 'auto'
                }, paint: {
                    'text-color': "#000000", 'text-halo-color': "#fff", 'text-halo-width': 2, 'text-halo-blur': 1,
                }
            });
        }
    }, [mapInitialized]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current || !from) return;

        const map = mapRef.current;
        const startSource = map.getSource('start-marker') as maplibregl.GeoJSONSource;

        if (startSource) {
            startSource.setData({
                type: 'Feature',
                properties: {name: from.name || 'Partenza'},
                geometry: {type: 'Point', coordinates: [from.lon, from.lat]}
            });
        }
    }, [mapInitialized, from?.lat, from?.lon, from?.name]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current || !to) return;

        const map = mapRef.current;
        const endSource = map.getSource('end-marker') as maplibregl.GeoJSONSource;

        if (endSource) {
            endSource.setData({
                type: 'Feature',
                properties: {name: to.name || 'Destinazione'},
                geometry: {type: 'Point', coordinates: [to.lon, to.lat]}
            });
        }
    }, [mapInitialized, to?.lat, to?.lon, to?.name]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        const map = mapRef.current;

        if (map.getLayer('intermediate-stops-circles')) map.removeLayer('intermediate-stops-circles');
        if (map.getLayer('intermediate-stops-labels')) map.removeLayer('intermediate-stops-labels');
        if (map.getSource('intermediate-stops')) map.removeSource('intermediate-stops');

        (async () => {
            const snapped = await snappedStops;

            if (!snapped.length || !legs.length) return;

            const decoded = await decodedLegs;
            const firstStop = snapped[0];
            const lastStop = snapped[snapped.length - 1];

            const hideStart = from && firstStop && getDistance(from.lat, from.lon, firstStop.lat, firstStop.lon) < 50;
            const hideEnd = to && lastStop && getDistance(to.lat, to.lon, lastStop.lat, lastStop.lon) < 50;

            const visibleStops = snapped
                .map((stop, originalIndex) => ({stop, originalIndex}))
                .filter(({originalIndex}) => {
                    const isStart = originalIndex === 0;
                    const isEnd = originalIndex === snapped.length - 1;
                    const shouldHide = (isStart && hideStart) || (isEnd && hideEnd);
                    return !shouldHide;
                });


            if (!visibleStops.length) return;

            const features = visibleStops.map(({stop, originalIndex}) => {
                let closestLegIndex = 0;
                let minDistance = Infinity;

                decoded.forEach((legPoints, legIndex) => {
                    legPoints.forEach(([lat, lon]) => {
                        const distance = getDistance(stop.lat, stop.lon, lat, lon);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestLegIndex = legIndex;
                        }
                    });
                });

                const legColor = legs[closestLegIndex].routeColor ? `#${legs[closestLegIndex].routeColor}` : "#999";

                return {
                    type: 'Feature' as const, properties: {
                        name: stop.name || '', priority: originalIndex, color: legColor
                    }, geometry: {
                        type: 'Point' as const, coordinates: [stop.lon, stop.lat]
                    }
                }
            });

            map.addSource('intermediate-stops', {
                type: 'geojson', data: {type: 'FeatureCollection', features}
            });

            map.addLayer({
                id: 'intermediate-stops-circles', type: 'circle', source: 'intermediate-stops', paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 12, 4, 14, 5, 16, 7],
                    'circle-color': ['get', 'color'],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                }
            });

            map.addLayer({
                id: 'intermediate-stops-labels', type: 'symbol', source: 'intermediate-stops', layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 12,
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
                    'text-radial-offset': 1.0,
                    'text-justify': 'auto',
                    'symbol-placement': 'point',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'text-optional': false,
                    'icon-allow-overlap': false,
                    'icon-ignore-placement': false,
                    'symbol-avoid-edges': true,
                    'text-padding': 2,
                    'symbol-sort-key': ['get', 'priority'],
                    'symbol-z-order': 'auto'
                }, paint: {
                    'text-color': "#000000", 'text-halo-color': "#fff", 'text-halo-width': 2, 'text-halo-blur': 1,
                }
            });
        })();
    }, [mapInitialized, snappedStops, from, to, legs, decodedLegs]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

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

        if (!legs.length) {
            const source = map.getSource('route-source') as maplibregl.GeoJSONSource;
            if (source) {
                source.setData({type: 'FeatureCollection', features: []});
            }
            return;
        }

        const startAnimation = async () => {
            try {
                const decoded = await decodedLegs;
                if (!decoded.length) return;

                if (from) {
                    const firstLeg = decoded.find(leg => leg.length > 0);
                    const firstLegIndex = decoded.findIndex(leg => leg.length > 0);
                    if (firstLeg && firstLegIndex !== -1) {
                        const [lat, lon] = firstLeg[0];
                        const isWalk = legs[firstLegIndex]?.mode === "WALK";
                        const distStart = getDistance(from.lat, from.lon, lat, lon);
                        const finalStartCoords = (!isWalk && distStart <= 10) ? [lon, lat] : [from.lon, from.lat];

                        const startSource = map.getSource('start-marker') as maplibregl.GeoJSONSource;
                        if (startSource) {
                            startSource.setData({
                                type: 'Feature',
                                properties: {name: from.name || 'Partenza'},
                                geometry: {type: 'Point', coordinates: finalStartCoords}
                            });
                        }
                    }
                }

                if (to) {
                    const lastLegIndex = decoded.length - 1 - [...decoded].reverse().findIndex(leg => leg.length > 0);
                    const lastLeg = decoded[lastLegIndex];
                    if (lastLeg && lastLegIndex !== -1) {
                        const [lat, lon] = lastLeg[lastLeg.length - 1];
                        const isWalk = legs[lastLegIndex]?.mode === "WALK";
                        const distEnd = getDistance(to.lat, to.lon, lat, lon);
                        const finalEndCoords = (!isWalk && distEnd <= 10) ? [lon, lat] : [to.lon, to.lat];

                        const endSource = map.getSource('end-marker') as maplibregl.GeoJSONSource;
                        if (endSource) {
                            endSource.setData({
                                type: 'Feature',
                                properties: {name: to.name || 'Destinazione'},
                                geometry: {type: 'Point', coordinates: finalEndCoords}
                            });
                        }
                    }
                }

                const totalPoints = decoded.reduce((sum, leg) => sum + leg.length, 0);
                const legEndPoints: number[] = [];
                let cumulative = 0;
                decoded.forEach(leg => {
                    cumulative += leg.length;
                    legEndPoints.push(cumulative);
                });

                const layers = map.getStyle().layers;
                const markerLayer = layers.find(l => l.id.includes('intermediate-stops-circles') || l.id.includes('start-marker-circle') || l.id.includes('end-marker-circle'));
                const beforeId = markerLayer?.id;

                decoded.forEach((_, idx) => {
                    const legColor = legs[idx].mode === "WALK" ? "#999" : legs[idx].routeColor ? `#${legs[idx].routeColor}` : "#036633";

                    map.addSource(`route-source-${idx}`, {
                        type: 'geojson', data: {
                            type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: []}
                        }
                    });

                    map.addLayer({
                        id: `route-layer-${idx}`,
                        type: 'line',
                        source: `route-source-${idx}`,
                        layout: {'line-join': 'round', 'line-cap': 'round'},
                        paint: {'line-color': legColor, 'line-width': 6, 'line-opacity': 0.9}
                    }, beforeId);
                });

                const startTime = performance.now();

                const animate = (time: number) => {
                    const elapsed = time - startTime;
                    const progress = Math.min(elapsed / animationDuration, 1);
                    const currentTotalPoint = Math.floor(progress * totalPoints);

                    let pointsSoFar = 0;
                    decoded.forEach((legPoints, idx) => {
                        const legStartPoint = pointsSoFar;

                        if (currentTotalPoint >= legStartPoint) {
                            const count = Math.min(currentTotalPoint - legStartPoint + 1, legPoints.length);
                            const coordinates = legPoints
                                .slice(0, count)
                                .map(([lat, lon]) => [lon, lat]);

                            const source = map.getSource(`route-source-${idx}`) as maplibregl.GeoJSONSource;
                            if (source) {
                                source.setData({
                                    type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates}
                                });
                            }
                        }
                        pointsSoFar = legEndPoints[idx];
                    });

                    if (progress < 1) {
                        animationFrameRef.current = requestAnimationFrame(animate);
                    } else {
                        decoded.forEach((legPoints, idx) => {
                            const coordinates = legPoints.map(([lat, lon]) => [lon, lat]);
                            const source = map.getSource(`route-source-${idx}`) as maplibregl.GeoJSONSource;
                            if (source) {
                                source.setData({
                                    type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates}
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
    }, [legs, mapInitialized, from, to, animationDuration, decodedLegs, updateMapBounds]);

    return <div ref={mapContainerRef} className={className} />;
}