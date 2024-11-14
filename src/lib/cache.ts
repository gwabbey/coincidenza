import { fetchData } from '@/api';
import { unstable_cache } from 'next/cache';

export const getCachedStops = unstable_cache(
    async (type: string) => {
        const response = await fetchData('stops', {
            params: type ? { type } : {}
        });
        return response;
    },
    ['stops'],
    {
        revalidate: 24 * 60 * 60,
        tags: ['stops']
    }
);

export const getStopsLookup = unstable_cache(
    async (type: string) => {
        const stops = await getCachedStops(type);
        return stops.reduce((acc: Record<string, any>, stop: any) => {
            acc[stop.stopId] = stop;
            return acc;
        }, {});
    },
    ['stops-lookup'],
    {
        revalidate: 24 * 60 * 60,
        tags: ['stops']
    }
); 