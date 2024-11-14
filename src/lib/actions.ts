import { revalidateTag } from 'next/cache';

export async function invalidateStopsCache() {
    revalidateTag('stops');
} 