"use client"

import {formatDate, getDelayColor} from "@/utils"
import {IconAntennaBarsOff} from "@tabler/icons-react"
import {AnimatePresence, motion, useAnimationControls} from "motion/react"
import {useRouter} from "next/navigation"
import {useEffect} from "react"
import {Link} from "@heroui/react";
import {type BusDeparture} from "@/api/types";

export function Bus({departures}: { departures: BusDeparture[] }) {
    const router = useRouter()
    const controls = useAnimationControls();

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, 15000);
        return () => clearInterval(intervalId);
    }, [router]);

    useEffect(() => {
        const i = setInterval(() => {
            controls.start({
                opacity: [1, 0, 1], transition: {
                    duration: 1, times: [0, 0.5, 1], ease: "easeInOut",
                }
            });
        }, 1000);

        return () => clearInterval(i);
    }, [controls]);

    if (departures.length === 0) {
        return (<div className="text-center text-lg text-foreground-500 font-bold p-4">
            nessuna corsa in partenza
        </div>);
    }

    return (<div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
            {departures.map((trip) => {
                return (<motion.div
                    key={trip.id}
                    layoutId={trip.id}
                    layout
                    initial={{opacity: 0}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -20, transition: {duration: 0.3}}}
                    transition={{duration: 0.3, ease: "easeInOut"}}
                >
                    <div className="flex flex-row justify-between gap-4">
                        <div className="flex gap-2 w-full">
                            <div
                                className="flex items-center justify-center w-full max-w-16 p-2 text-lg font-bold text-center rounded-small bg-gray-500 text-white self-center min-h-10">
                                {formatDate(trip.departureTime)}
                            </div>
                            <Link color="foreground" href={`/track/trentino-trasporti/${trip.id}`}
                                  className="text-base sm:text-lg min-w-0 grow">
                                <div className="flex flex-col text-left w-full grow min-w-0">
                                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                        <div className="flex items-center gap-x-1 sm:gap-x-2 min-w-0">
                                            <span
                                                className="text-md font-bold rounded-small flex items-center gap-x-1 text-white whitespace-nowrap"
                                                style={{
                                                    backgroundColor: trip.color ? `#${trip.color}` : "",
                                                    padding: "0.1rem 0.5rem"
                                                }}>
                                                {trip.route}
                                            </span>
                                            <div className="truncate font-bold text-base sm:text-lg min-w-0">
                                                {trip.destination}
                                            </div>
                                        </div>
                                        {trip.delay === null ? (
                                            <p className="text-lg font-bold uppercase shrink-0 whitespace-nowrap text-foreground-500">
                                                <IconAntennaBarsOff />
                                            </p>) : (
                                            <p className={`text-lg font-bold uppercase shrink-0 whitespace-nowrap text-${getDelayColor(trip.delay)}`}>
                                                {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : ""}
                                                {trip.delay !== 0 && `${trip.delay}'`}
                                            </p>)}
                                    </div>

                                    <div className="text-sm text-foreground-500">
                                        {!trip.started ? "non ancora partito" : trip.stopsAway ? (
                                            <span>a <strong>{trip.stopsAway}</strong> fermat{trip.stopsAway > 1 ? 'e' : 'a'} da
                                        te</span>) : (<div className="flex items-center gap-1 whitespace-pre">
                                            {trip.departing && (<div className="flex items-center gap-1 whitespace-pre">
                                                <motion.div animate={controls}>
                                                    <p className="text-sm text-green-500 font-bold">
                                                        in partenza
                                                    </p>
                                                </motion.div>
                                            </div>)}
                                        </div>)}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </motion.div>)
            })}
        </AnimatePresence>
    </div>)
}