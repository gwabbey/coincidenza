'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateLocation(name: string, coordinates: string) {
    cookies().set(name, coordinates, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });

    revalidatePath('/directions');
}