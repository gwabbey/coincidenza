"use client";
import {HeroUIProvider, ToastProvider} from '@heroui/react';
import {ThemeProvider} from "next-themes";
import {useTransitionRouter} from 'next-view-transitions';

export default function Providers({children}: { children: React.ReactNode }) {
    const router = useTransitionRouter();

    return (
        <ThemeProvider attribute="class" scriptProps={{'data-cfasync': 'false'}}>
            <HeroUIProvider navigate={router.push} locale="it-IT">
                {children}
                <ToastProvider placement="top-center" />
            </HeroUIProvider>
        </ThemeProvider>
    );
}