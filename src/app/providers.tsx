"use client";

import { HeroUIProvider, ToastProvider } from '@heroui/react';
import { ThemeProvider } from "next-themes";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                router.refresh()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [])

    return <ThemeProvider attribute="class" scriptProps={{ 'data-cfasync': 'false' }}>
        <HeroUIProvider navigate={router.push}>
            {children}
            <ToastProvider />
        </HeroUIProvider>
    </ThemeProvider>
}