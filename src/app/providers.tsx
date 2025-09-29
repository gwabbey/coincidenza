"use client";
import {HeroUIProvider, ToastProvider} from '@heroui/react';
import {ThemeProvider} from "next-themes";
import {useRouter} from "next/navigation";

export default function Providers({children}: { children: React.ReactNode }) {
    const router = useRouter();

    return (
        <ThemeProvider attribute="class" scriptProps={{'data-cfasync': 'false'}}>
            <HeroUIProvider navigate={router.push} locale="it-IT">
                {children}
                <ToastProvider placement="top-center" />
            </HeroUIProvider>
        </ThemeProvider>
    );
}