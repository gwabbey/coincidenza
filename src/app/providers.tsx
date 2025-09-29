"use client";

import {useEffect, useRef} from "react";
import {HeroUIProvider, ToastProvider} from "@heroui/react";
import {ThemeProvider} from "next-themes";
import {useRouter} from "next/navigation";

export default function Providers({children}: { children: React.ReactNode }) {
    const router = useRouter();
    const lastActiveRef = useRef(Date.now());
    const MAX_INACTIVE_TIME = 5 * 60 * 1000;

    useEffect(() => {
        const checkIfReloadNeeded = () => {
            const now = Date.now();
            const inactiveTime = now - lastActiveRef.current;

            if (inactiveTime > MAX_INACTIVE_TIME) {
                window.location.reload();
            } else {
                lastActiveRef.current = now;
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                checkIfReloadNeeded();
            }
        };

        window.addEventListener("focus", checkIfReloadNeeded);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("focus", checkIfReloadNeeded);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    return (
        <ThemeProvider attribute="class" scriptProps={{"data-cfasync": "false"}}>
            <HeroUIProvider navigate={router.push} locale="it-IT">
                {children}
                <ToastProvider placement="top-center" />
            </HeroUIProvider>
        </ThemeProvider>
    );
}