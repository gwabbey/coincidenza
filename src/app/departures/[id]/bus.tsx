"use client"

import {formatDate, getDelayColor} from "@/utils"
import {AnimatePresence, motion, useAnimationControls} from "motion/react"
import {useRouter} from "next/navigation"
import {useEffect} from "react"
import {cn, Link} from "@heroui/react";
import {type BusDeparture} from "@/api/types";
import {differenceInMinutes} from "date-fns";
import {IconCircleFilled} from "@tabler/icons-react";

function getMinutesAway(scheduled: string, actual?: string | null) {
    const departure = actual ? new Date(actual) : new Date(scheduled);
    return Math.max(0, differenceInMinutes(departure, new Date()));
}

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
                const minutesAway = getMinutesAway(trip.departureTime, new Date(new Date(trip.departureTime).getTime() + trip.delay * 60000).toISOString())

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
                                className="flex items-center justify-center text-lg font-bold rounded-small py-1 px-2 text-white whitespace-nowrap w-full max-w-16"
                                style={{
                                    backgroundColor: trip.color ? `#${trip.color}` : "",
                                }}>
                                {trip.route}
                            </div>

                            <Link
                                color="foreground"
                                href={`/track/${trip.company}/${trip.id}`}
                                className="text-lg min-w-0 grow"
                            >
                                <div className="flex flex-col text-left w-full grow min-w-0">
                                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                        <div className="flex items-center gap-x-1 sm:gap-x-2 min-w-0 flex-1">
                                            <div className="truncate font-bold text-lg min-w-0 flex-1">
                                                {trip.destination}
                                            </div>
                                        </div>
                                        <div
                                            className={cn("text-lg flex gap-x-1 font-bold shrink-0", trip.delay != null ? `text-${getDelayColor(Math.max(trip.delay, 0))}` : "text-foreground-500")}
                                        >
                                            <span>
                                              {minutesAway == 0 ? (<motion.div animate={controls}>
                                                  <IconCircleFilled
                                                      className={cn(trip.tracked ? "text-success" : "text-foreground-500")}
                                                  />
                                              </motion.div>) : minutesAway < 60 ? `${minutesAway} min` : formatDate(trip.departureTime)}
                                            </span>
                                        </div>
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