"use client";
import { addToast, HeroUIProvider, ToastProvider } from '@heroui/react';
import { ThemeProvider } from "next-themes";
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const lastRefreshRef = useRef<number>(0);
    const refreshCooldown = 5000;

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastRefreshRef.current > refreshCooldown) {
                    lastRefreshRef.current = now;
                    router.refresh();
                }
            }
        };

        const handleFocus = () => {
            const now = Date.now();
            if (now - lastRefreshRef.current > refreshCooldown) {
                lastRefreshRef.current = now;
                router.refresh();
            }
        };

        const handleOnline = () => {
            addToast({ title: "Sei connesso!", color: "success" });
            const now = Date.now();
            lastRefreshRef.current = now;
            router.refresh();
        };

        const handleOffline = () => {
            addToast({ title: "Connessione persa!", color: "danger" });
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                const now = Date.now();
                lastRefreshRef.current = now;
                router.refresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('pageshow', handlePageShow);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, [router]);

    return (
        <ThemeProvider attribute="class" scriptProps={{ 'data-cfasync': 'false' }}>
            <HeroUIProvider navigate={router.push}>
                {children}
                <ToastProvider />
            </HeroUIProvider>
        </ThemeProvider>
    );
}