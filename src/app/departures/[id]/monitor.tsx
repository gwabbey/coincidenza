'use client';
import { getDelayColor } from '@/utils';
import { Divider } from '@heroui/react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Monitor({ monitor }: { monitor: any }) {
    const router = useRouter();
    const [blinkKey, setBlinkKey] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, parseInt(process.env.AUTO_REFRESH || "10000", 10));
        return () => clearInterval(intervalId);
    }, [router]);

    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlinkKey((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(blinkInterval);
    }, []);

    if (monitor.error) {
        return (
            <p className="text-center text-lg text-gray-500 font-bold p-4">
                {monitor.error}
            </p>
        );
    }

    if (monitor.trains.length === 0) {
        return (
            <p className="text-center text-lg text-gray-500 font-bold p-4">
                nessun treno in partenza
            </p>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            <AnimatePresence>
                {monitor.trains.map((train: any, index: number) => (
                    <motion.div
                        key={index}
                        layout
                        layoutId={train.number.toString()}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        <div className="flex flex-row justify-between gap-4">
                            <div className="flex gap-2 w-full">
                                <div className="w-full max-w-16 p-2 text-lg font-bold self-center text-center rounded-small bg-gray-500 text-white">
                                    {train.departureTime}
                                </div>

                                <div className="flex flex-col text-left w-full flex-grow min-w-0">
                                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                        <Link className="font-bold text-base sm:text-lg capitalize truncate min-w-0 flex-grow" href={`/track/${train.company.toLowerCase().replace(' ', '-')}/${train.number}`}>
                                            {train.destination}
                                        </Link>
                                        {train.delay !== "0" && (
                                            <p className={`text-lg font-bold uppercase flex-shrink-0 whitespace-nowrap text-${getDelayColor(train.delay)}`}>
                                                {parseInt(train.delay) > 0 ? `+${train.delay}'` : train.delay}
                                            </p>
                                        )}
                                    </div>

                                    <Link className="text-sm text-gray-500 capitalize" href={`/track/${train.company.toLowerCase().replace(' ', '-')}/${train.number}`}>
                                        {train.shortCategory || train.company} {train.number}{" "}
                                        {train.shortCategory && train.company && `• ${train.company}`}
                                    </Link>

                                    {!train.departing ? (
                                        <div className="flex items-center gap-1 whitespace-pre">
                                            {train.platform !== "Piazzale Ferrovia" && (
                                                <p className="text-sm text-gray-500">
                                                    {train.platform ? "binario" : ""}
                                                </p>
                                            )}
                                            <p className="text-sm text-blue-500 font-bold">
                                                {train.platform}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 whitespace-pre">
                                            <p className="text-sm text-green-500 font-bold">
                                                in partenza
                                            </p>
                                            {train.platform &&
                                                train.platform !== "Piazzale Ferrovia" && (
                                                    <p className="text-sm text-gray-500">• binario</p>
                                                )}
                                            <motion.div
                                                key={blinkKey}
                                                initial={{ opacity: 1 }}
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{
                                                    duration: 1,
                                                    times: [0, 0.5, 1],
                                                    ease: "easeInOut",
                                                }}
                                            >
                                                <p className="text-sm text-blue-500 font-bold">
                                                    {train.platform}
                                                </p>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            <Divider />

            <p className="text-gray-500 text-center">{monitor.alerts}</p>
        </div>
    );
}
