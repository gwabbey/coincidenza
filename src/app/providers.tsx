"use client";

import {useEffect, useRef} from "react";
import {HeroUIProvider, ToastProvider} from "@heroui/react";
import {ThemeProvider} from "next-themes";
import {useRouter} from "next/navigation";

export default function Providers({children}: { children: React.ReactNode }) {
    const router = useRouter();
    const ref = useRef(false);

    useEffect(() => {
        const refresh = () => {
            if (ref.current) return;
            ref.current = true;

            router.refresh();

            setTimeout(() => {
                ref.current = false;
            }, 2000);
        };

        const onVisible = () => {
            if (document.visibilityState === "visible") refresh();
        };

        const onFocus = () => refresh();

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [router]);

    return (<ThemeProvider attribute="class" scriptProps={{"data-cfasync": "false"}}>
        <HeroUIProvider navigate={router.push} locale="it-IT">
            {children}
            <ToastProvider placement="top-center" />
        </HeroUIProvider>
    </ThemeProvider>);
}