'use client';
import {StationMonitor} from '@/api/types';
import {capitalize, getDelayColor} from '@/utils';
import {Alert} from '@heroui/react';
import {IconInfoCircleFilled} from '@tabler/icons-react';
import {AnimatePresence, motion} from 'motion/react';
import {Link} from 'next-view-transitions';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

function getTrackUrl(company: string, id: string, category?: string): string | null {
    const normalizedCompany = company.toLowerCase().trim();

    if ((category == "railjet" || category == "eurocity" || category == "ec" || category == "rj") && normalizedCompany == "trenord") {
        return `/track/trenitalia/${id}`;
    }

    if (
        normalizedCompany === "frecciarossa" ||
        normalizedCompany === "frecciargento" ||
        normalizedCompany === "frecciabianca" ||
        normalizedCompany === "intercity" ||
        normalizedCompany === "intercity notte" ||
        normalizedCompany === "treno storico" ||
        normalizedCompany === "espresso"
    ) {
        return `/track/trenitalia/${id}`;
    }

    switch (normalizedCompany) {
        case "trenord":
            return `/track/trenord/${id}`;
        case "trentino trasporti":
            return null;
        case "sad":
            return null;
        case "italo":
            return null;
        case "öbb":
            return null;
        case "trenitalia":
        case "trenitalia tper":
        default:
            return `/track/trenitalia/${id}`;
    }
}

export function Monitor({monitor}: { monitor: StationMonitor }) {
    const router = useRouter();
    const [blinkKey, setBlinkKey] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, parseInt(process.env.AUTO_REFRESH || "15000", 10));
        return () => clearInterval(intervalId);
    }, [router]);

    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlinkKey((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(blinkInterval);
    }, []);

    if (monitor.trains.length === 0) {
        return (
            <div className="text-center text-lg text-foreground-500 font-bold p-4">
                nessuna corsa in partenza
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            {monitor && (
                <AnimatePresence mode="popLayout">
                    {monitor.alerts && <Alert color="warning" className="transition-colors shadow-medium text-left"
                                              icon={<IconInfoCircleFilled />}>{monitor.alerts}</Alert>}
                    {monitor.trains.map((train: any) => (
                        <motion.div
                            key={`${train.shortCategory || train.company || ""} ${train.number.toString()} ${train.destination}`}
                            layout
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -20, transition: {duration: 0.3}}}
                            transition={{duration: 0.3, ease: "easeInOut"}}
                        >
                            <div className="flex flex-row justify-between gap-4">
                                <div className="flex gap-2 w-full">
                                    <div
                                        className="flex items-center justify-center w-full max-w-16 p-2 text-lg font-bold text-center rounded-small bg-gray-500 text-white self-center">
                                        {train.departureTime}
                                    </div>

                                    <div className="flex flex-col text-left w-full flex-grow min-w-0">
                                        <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                            {getTrackUrl(train.company, train.number, train.category) && train.category !== "autocorsa" ? (
                                                <Link
                                                    className="font-bold text-base sm:text-lg truncate min-w-0 flex-grow"
                                                    href={getTrackUrl(train.company, train.number, train.category)!}
                                                >
                                                    {capitalize(train.destination)}
                                                </Link>
                                            ) : (
                                                <span
                                                    className="font-bold text-base sm:text-lg truncate min-w-0 flex-grow">
                                                    {capitalize(train.destination)}
                                                </span>
                                            )}
                                            {train.delay !== "0" && (
                                                <p className={`text-lg font-bold uppercase flex-shrink-0 whitespace-nowrap text-${getDelayColor(train.delay)}`}>
                                                    {parseInt(train.delay) > 0 ? `+${train.delay}'` : train.delay}
                                                </p>
                                            )}
                                        </div>

                                        {getTrackUrl(train.company, train.number, train.category) && train.category !== "autocorsa" ? (
                                            <Link
                                                className="text-sm text-foreground-500 capitalize"
                                                href={getTrackUrl(train.company, train.number, train.category)!}
                                            >
                                                {train.shortCategory || "Treno"} {train.number}{" "}
                                                {train.company && `• ${train.company}`}
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-foreground-500 capitalize">
                                                {train.shortCategory || "Treno"} {train.number}{" "}
                                                {train.company && `• ${train.company}`}
                                            </span>
                                        )}

                                        {!train.departing ? (
                                            <div className="flex items-center gap-1 whitespace-pre">
                                                {train.platform !== "Piazzale Esterno" && (
                                                    <p className="text-sm text-foreground-500">
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
                                                    train.platform !== "Piazzale Esterno" && (
                                                        <p className="text-sm text-foreground-500">• binario</p>
                                                    )}
                                                <motion.div
                                                    key={blinkKey}
                                                    initial={{opacity: 1}}
                                                    animate={{opacity: [1, 0, 1]}}
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
                    <p key="credits" className="text-sm text-foreground-500 text-center">dati forniti da <Link
                        href="https://www.rfi.it" target="_blank" rel="noopener noreferrer">RFI</Link></p>
                </AnimatePresence>
            )}
        </div>
    );
}
