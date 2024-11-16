'use client';

import dynamic from 'next/dynamic';
import polyline from '@mapbox/polyline';

const DynamicMap = dynamic(() => import('./leaflet'), { ssr: false });

export default function MapComponent({ encodedPolyline }: { encodedPolyline: string }) {
    const decodedPath = polyline.decode(encodedPolyline);

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '2rem', overflow: 'hidden' }}>
            <DynamicMap decodedPath={decodedPath} />
        </div>
    );
}