'use client';
import { Button } from "@heroui/react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

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
                            key={theme}
                            initial={{ rotate: -30 }}
                            animate={{ rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                            {theme === 'light' ? (<IconMoon />) : (<IconSun />)}
                        </motion.div>
                    )}
                </Button>
            </div>
        </div>
    );
}