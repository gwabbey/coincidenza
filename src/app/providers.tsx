"use client";
import { addToast, HeroUIProvider, ToastProvider } from '@heroui/react';
import { ThemeProvider } from "next-themes";
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const lastRefreshRef = useRef<number>(0);

    /* useEffect(() => {
        const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (!isIOS || !isStandalone) return;

        let startY = 0;
        let isPulling = false;

        const onTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) startY = e.touches[0].clientY;
        };

        const onTouchMove = (e: TouchEvent) => {
            const deltaY = e.touches[0].clientY - startY;
            if (deltaY > 50 && window.scrollY === 0) {
                isPulling = true;
            }
        };

        const onTouchEnd = () => {
            if (isPulling) {
                isPulling = false;
                router.refresh();
            }
        };

        window.addEventListener('touchstart', onTouchStart);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, []); */

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastRefreshRef.current > 1000) {
                    lastRefreshRef.current = now;
                    router.refresh();
                }
            }
        };

        const handleFocus = () => {
            const now = Date.now();
            if (now - lastRefreshRef.current > 1000) {
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