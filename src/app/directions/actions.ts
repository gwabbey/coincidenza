'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function clearCookies() {
    (await cookies()).set('from', '', {
        maxAge: -1,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });

    (await cookies()).set('to', '', {
        maxAge: -1,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });

    revalidatePath('/directions');
}