'use client';
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

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function findClosestPointOnPolyline(
    targetLat: number,
    targetLon: number,
    polylinePoints: Array<[number, number]>
): { lat: number; lon: number } {
    let minDistance = Infinity;
    let closestPoint = {lat: targetLat, lon: targetLon};

    for (const point of polylinePoints) {
        const [lat, lon] = point;
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
    }>({
        intermediates: [],
    });
    const animationFrameRef = useRef<number | null>(null);
    const [mapInitialized, setMapInitialized] = useState(false);
    const [simplifiedStops, setSimplifiedStops] = useState<Coordinate[]>([]);
    const [snappedStops, setSnappedStops] = useState<Coordinate[]>([]);

    const labelColor = '#000000';
    const haloColor = '#fff';

    useEffect(() => {
        if (!intermediateStops || intermediateStops.length === 0) {
            setSimplifiedStops(prev => prev.length === 0 ? prev : []);
            return;
        }

        const simplified: Coordinate[] = [];
        const MERGE_THRESHOLD = 150;

        for (let i = 0; i < intermediateStops.length; i++) {
            const current = intermediateStops[i];
            const next = intermediateStops[i + 1];

            if (next) {
                const distance = getDistance(current.lat, current.lon, next.lat, next.lon);

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
        const snapStopsToPolyline = async () => {
            if (!simplifiedStops || simplifiedStops.length === 0 || legs.length === 0) {
                setSnappedStops([]);
                return;
            }

            try {
                const decodedLegs = await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));
                const allPolylinePoints: Array<[number, number]> = [];

                decodedLegs.forEach(legPoints => {
                    allPolylinePoints.push(...legPoints);
                });

                if (allPolylinePoints.length === 0) {
                    setSnappedStops(simplifiedStops);
                    return;
                }

                const snapped = simplifiedStops.map((stop, index) => {
                    const isFirst = index === 0;
                    const isLast = index === simplifiedStops.length - 1;

                    if (isFirst) {
                        const [lat, lon] = allPolylinePoints[0];
                        return {
                            lat,
                            lon,
                            name: stop.name
                        };
                    } else if (isLast) {
                        const [lat, lon] = allPolylinePoints[allPolylinePoints.length - 1];
                        return {
                            lat,
                            lon,
                            name: stop.name
                        };
                    } else {
                        const closestPoint = findClosestPointOnPolyline(stop.lat, stop.lon, allPolylinePoints);
                        return {
                            lat: closestPoint.lat,
                            lon: closestPoint.lon,
                            name: stop.name
                        };
                    }
                });

                setSnappedStops(snapped);
            } catch (error) {
                console.error("Error snapping stops to polyline:", error);
                setSnappedStops(simplifiedStops);
            }
        };

        snapStopsToPolyline();
    }, [simplifiedStops, legs]);

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

    }, [mapInitialized, labelColor, haloColor]);

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
                        type: 'Feature',
                        properties: {name: from.name || 'Partenza'},
                        geometry: {type: 'Point', coordinates: [from.lon, from.lat]}
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
                    id: 'start-marker-label',
                    type: 'symbol',
                    source: 'start-marker',
                    layout: {
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
                    },
                    paint: {
                        'text-color': labelColor,
                        'text-halo-color': haloColor,
                        'text-halo-width': 2,
                        'text-halo-blur': 1
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
    }, [mapInitialized, from?.name]);

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
                    id: 'end-marker-label',
                    type: 'symbol',
                    source: 'end-marker',
                    layout: {
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
                    },
                    paint: {
                        'text-color': labelColor,
                        'text-halo-color': haloColor,
                        'text-halo-width': 2,
                        'text-halo-blur': 1
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
    }, [mapInitialized, to?.name]);

    useEffect(() => {
        if (!mapInitialized || !mapRef.current) return;

        markersRef.current.intermediates.forEach(({marker, label}) => {
            marker.remove();
            if (label) label.remove();
        });
        markersRef.current.intermediates = [];

        const map = mapRef.current;

        if (map.getLayer('intermediate-stops-circles')) map.removeLayer('intermediate-stops-circles');
        if (map.getLayer('intermediate-stops-labels')) map.removeLayer('intermediate-stops-labels');
        if (map.getSource('intermediate-stops')) map.removeSource('intermediate-stops');

        if (snappedStops?.length) {
            const THRESHOLD = 150;

            const firstStop = snappedStops[0];
            const lastStop = snappedStops.at(-1);

            const hideStart = from && firstStop && getDistance(from.lat, from.lon, firstStop.lat, firstStop.lon) < THRESHOLD;
            const hideEnd = to && lastStop && getDistance(to.lat, to.lon, lastStop.lat, lastStop.lon) < THRESHOLD;

            const features = snappedStops.map((stop, index) => {
                const isStart = index === 0;
                const isEnd = index === snappedStops.length - 1;

                const hidden = (isStart && hideStart) || (isEnd && hideEnd);

                return {
                    type: 'Feature', properties: {
                        name: hidden ? '' : (stop.name || ''),
                        hidden,
                        priority: index
                    }, geometry: {
                        type: 'Point', coordinates: [stop.lon, stop.lat]
                    }
                };
            });

            map.addSource('intermediate-stops', {
                type: 'geojson', data: {type: 'FeatureCollection', features: features as any}
            });

            map.addLayer({
                id: 'intermediate-stops-circles',
                type: 'circle',
                source: 'intermediate-stops',
                filter: ['!', ['get', 'hidden']],
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 3,
                        12, 4,
                        14, 5,
                        16, 6
                    ],
                    'circle-color': '#007AFF',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                    'circle-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        9, 0,
                        10, 0.3,
                        12, 1
                    ]
                }
            });

            map.addLayer({
                id: 'intermediate-stops-labels',
                type: 'symbol',
                source: 'intermediate-stops',
                filter: ['!', ['get', 'hidden']],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Noto Sans Regular'],
                    'text-size': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 10,
                        12, 11,
                        14, 12,
                        16, 13
                    ],
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
                    'text-radial-offset': 0.8,
                    'text-justify': 'auto',
                    'symbol-placement': 'point',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'icon-allow-overlap': false,
                    'icon-ignore-placement': false,
                    'symbol-avoid-edges': true,
                    'text-padding': 4,
                    'symbol-sort-key': ['get', 'priority'],
                    'symbol-z-order': 'auto'
                },
                paint: {
                    'text-color': labelColor,
                    'text-halo-color': haloColor,
                    'text-halo-width': 2,
                    'text-halo-blur': 1,
                    'text-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 0,
                        11, 0.5,
                        12, 1
                    ]
                }
            });
        }

        updateMapBounds();
    }, [snappedStops, mapInitialized, legs, from, to, labelColor]);

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
                source.setData({type: 'FeatureCollection', features: []});
            }
            return;
        }

        const startAnimation = async () => {
            try {
                const map = mapRef.current!;
                const decodedLegs = await Promise.all(legs.map(leg => decodePolyline(leg.legGeometry.points)));

                if (decodedLegs.length === 0) return;

                if (from) {
                    const firstLeg = decodedLegs.find(leg => leg.length > 0);

                    if (!firstLeg) {
                        return;
                    }

                    const firstPoint = firstLeg[0];
                    const [lat, lon] = firstPoint;
                    const distStart = getDistance(from.lat, from.lon, lat, lon);
                    const finalStartCoords = distStart <= 50 ? [lon, lat] : [from.lon, from.lat];
                    const startSource = map.getSource('start-marker') as maplibregl.GeoJSONSource;

                    if (startSource) {
                        startSource.setData({
                            type: 'Feature',
                            properties: {name: from.name || 'Partenza'},
                            geometry: {type: 'Point', coordinates: finalStartCoords}
                        });
                    }
                }

                if (to) {
                    const lastLeg = [...decodedLegs]
                        .reverse()
                        .find(leg => leg.length > 0);

                    if (!lastLeg) return;

                    const lastPoint = lastLeg[lastLeg.length - 1];
                    const [lat, lon] = lastPoint;
                    const distEnd = getDistance(to.lat, to.lon, lat, lon);
                    const finalEndCoords = distEnd <= 50 ? [lon, lat] : [to.lon, to.lat];
                    const endSource = map.getSource('end-marker') as maplibregl.GeoJSONSource;

                    if (endSource) {
                        endSource.setData({
                            type: 'Feature', properties: {name: to.name || 'Destinazione'}, geometry: {
                                type: 'Point', coordinates: finalEndCoords
                            }
                        });
                    }
                }

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
                            type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: []}
                        }
                    });

                    const layers = map.getStyle().layers;
                    const markerLayer = layers.find(l => l.id.includes('intermediate-stops-circles') || l.id.includes('start-marker-circle') || l.id.includes('end-marker-circle'));
                    const beforeId = markerLayer?.id;

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
                    decodedLegs.forEach((legPoints, idx) => {
                        const legStartPoint = pointsSoFar;
                        const legEndPoint = legEndPoints[idx];

                        if (currentTotalPoint >= legStartPoint) {
                            const coordinates = legPoints
                                .slice(0, Math.min(currentTotalPoint - legStartPoint, legPoints.length))
                                .map(p => [p[1], p[0]]);

                            const source = map.getSource(`route-source-${idx}`) as maplibregl.GeoJSONSource;
                            if (source) {
                                source.setData({
                                    type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates}
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
    }, [legs, mapInitialized, from?.name, to?.name, snappedStops]);

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

        if (snappedStops) {
            snappedStops.forEach(stop => {
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
        className={className}
    />);
}