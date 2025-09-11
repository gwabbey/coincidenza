'use client';
import {Button} from "@heroui/react";
import {IconMoon, IconRefresh, IconSun} from "@tabler/icons-react";
import {motion} from "motion/react";
import {useTheme} from "next-themes";
import {Link} from "next-view-transitions";
import {useEffect, useState, useTransition} from "react";
import {useRouter} from "next/navigation";

export function Header() {
    const router = useRouter();
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);

    const [isPending, startTransition] = useTransition();
    const [isFakingRefresh, setIsFakingRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(0);

    const isLoading = isPending || isFakingRefresh;

    const handleClick = () => {
        if (isLoading) return;

        const now = Date.now();
        const tenSeconds = 10000;

        if (now - lastRefresh < tenSeconds) {
            setIsFakingRefresh(true);
            const randomDuration = Math.random() * 1500 + 500;
            setTimeout(() => setIsFakingRefresh(false), randomDuration);
        } else {
            startTransition(() => {
                router.refresh();
                setLastRefresh(Date.now());
            });
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
        <div className="flex justify-between items-center p-4">
            <Link href="/" className="font-thin text-2xl italic transition">trasporti.g3b.dev</Link>
            <div className="flex gap-2">
                <Button
                    onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    variant="bordered"
                    isIconOnly
                    radius="full"
                    className="border-gray-500 border-1"
                    aria-label="cambia tema"
                >
                    {mounted && (
                        <motion.div
                            key={isDark ? 'dark' : 'light'}
                            initial={{rotate: -30}}
                            animate={{rotate: 0}}
                            transition={{type: "spring", stiffness: 300, damping: 15}}
                        >
                            {isDark ? <IconSun /> : <IconMoon />}
                        </motion.div>
                    )}
                </Button>
            </div>

            <Button
                variant="bordered"
                isIconOnly
                radius="full"
                startContent={
                    <motion.div
                        animate={isLoading ? {
                            rotate: [0, 360],
                            transition: {repeat: isLoading ? Infinity : 0, duration: 1, ease: "linear"}
                        } : {rotate: 360}}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 15,
                            repeat: isLoading ? Infinity : 0,
                        }}
                    >
                        <IconRefresh />
                    </motion.div>
                }
                onPress={handleClick}
                isDisabled={isLoading}
                className="fixed bottom-5 right-5 p-2 border-gray-500 border-1 z-20"
            />
        </div>
    );
}