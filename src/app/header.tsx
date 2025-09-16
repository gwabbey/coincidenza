'use client';
import {Button} from "@heroui/react";
import {IconMoon, IconSun} from "@tabler/icons-react";
import {motion} from "motion/react";
import {useTheme} from "next-themes";
import {Link} from "next-view-transitions";
import {useEffect, useState} from "react";

export default function Header() {
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);

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
        </div>
    );
}