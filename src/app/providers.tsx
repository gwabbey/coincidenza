"use client";

import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';


export function Providers({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    return <HeroUIProvider navigate={router.push}>
        <NextThemesProvider attribute="class" defaultTheme="dark">
            {children}
            <Toaster />
        </NextThemesProvider>
    </HeroUIProvider>;
}