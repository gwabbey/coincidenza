"use client"

import {formatDate, getDelayColor} from "@/utils"
import {IconAntennaBarsOff} from "@tabler/icons-react"
import {AnimatePresence, motion} from "motion/react"
import Link from "next/link"
import {useRouter} from "next/navigation"
import {useEffect, useState} from "react"

function getStopsAway(selectedStopId: number, stopTimes: any[], delay: number | null = 0): number | null {
    const now = new Date();
    const selectedIndex = stopTimes.findIndex(s => s.stopId === selectedStopId);
    if (selectedIndex === -1) return null;

    const getAdjustedTime = (stop: any) => {
        const [h, m, s] = stop.departureTime.split(':').map(Number);
        const dep = new Date();
        dep.setHours(h, m, s || 0, 0);
        if (delay) dep.setMinutes(dep.getMinutes() + delay);
        return dep;
    };

    const passedIndex = stopTimes.findLastIndex(stop => getAdjustedTime(stop) <= now);
    const stopsAway = selectedIndex - passedIndex;
    return stopsAway <= 0 ? 0 : stopsAway;
}

export function Monitor({trips}: { trips: any[] }) {
    const router = useRouter()
    const [blinkKey, setBlinkKey] = useState(0)

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh()
        }, 15000)
        return () => clearInterval(intervalId)
    }, [router])

    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlinkKey((prev) => prev + 1)
        }, 1000)
        return () => clearInterval(blinkInterval)
    }, [])

    return (<div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
            {trips.map((trip) => {
                const now = Date.now();
                const isDelayed = trip.delay !== null
                const scheduledTime = new Date(trip.oraArrivoProgrammataAFermataSelezionata).toString()
                const arrivalTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata).getTime();

                const stopsAway = getStopsAway(trip.stopId, trip.stopTimes, trip.delay)
                const startsFromSelectedStop = trip.stopTimes[0]?.stopId === trip.stopId;

                const isArriving = trip.oraArrivoEffettivaAFermataSelezionata && arrivalTime - now <= 2 * 60 * 1000 && stopsAway === 0 && !startsFromSelectedStop;

                const hasDeparted = trip.lastEventRecivedAt !== null && stopsAway !== null && stopsAway > 0;

                return (<motion.div
                    key={trip.tripId}
                    layoutId={trip.tripId}
                    layout
                    initial={{opacity: 0}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -20, transition: {duration: 0.3}}}
                    transition={{duration: 0.3, ease: "easeInOut"}}
                >
                    <div className="flex flex-row justify-between gap-4">
                        <div className="flex gap-2 w-full">
                            <div
                                className="flex items-center justify-center w-full max-w-16 p-2 text-lg font-bold text-center rounded-small bg-gray-500 text-white self-center min-h-[2.5rem]">
                                {formatDate(scheduledTime)}
                            </div>

                            <div className="flex flex-col text-left w-full flex-grow min-w-0">
                                <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                    <Link href={`/track/trentino-trasporti/${trip.tripId}`}
                                          className="font-bold text-base sm:text-lg truncate min-w-0 flex-grow">
                                        <div className="flex items-center gap-x-1 sm:gap-x-2">
                                            <div
                                                className={`text-base sm:text-lg font-bold text-center rounded-small max-w-fit ${!trip.route?.routeColor && trip.type === "U" ? "bg-success text-white" : "bg-primary text-white"}`}
                                                style={{
                                                    backgroundColor: trip.route && trip.route.routeColor ? `#${trip.route.routeColor}` : "",
                                                    padding: "0.1rem 0.5rem"
                                                }}>
                                                {trip.route.routeShortName}
                                            </div>
                                            <div className="truncate font-bold text-base sm:text-lg min-w-0">
                                                {trip.tripHeadsign}
                                            </div>
                                        </div>
                                    </Link>
                                    {!trip.lastEventRecivedAt && (
                                        <p className="text-lg font-bold uppercase flex-shrink-0 whitespace-nowrap text-foreground-500">
                                            <IconAntennaBarsOff />
                                        </p>)}
                                    {isDelayed && (
                                        <p className={`text-lg font-bold uppercase flex-shrink-0 whitespace-nowrap text-${getDelayColor(trip.delay)}`}>
                                            {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : ""}
                                            {trip.delay !== 0 && `${trip.delay}'`}
                                        </p>)}
                                </div>

                                <Link
                                    className="text-sm text-foreground-500"
                                    href={`/track/trentino-trasporti/${trip.tripId}`}
                                >
                                    {stopsAway && hasDeparted ? (<>a <strong>{stopsAway}</strong> fermat{stopsAway > 1 ? 'e' : 'a'} da {trip.stopName}</>) : (
                                        <div className="flex items-center gap-1 whitespace-pre">
                                            {isArriving ? (<div className="flex items-center gap-1 whitespace-pre">
                                                <motion.div
                                                    key={blinkKey}
                                                    initial={{opacity: 1}}
                                                    animate={{opacity: [1, 0, 1]}}
                                                    transition={{
                                                        duration: 1, times: [0, 0.5, 1], ease: "easeInOut",
                                                    }}
                                                >
                                                    <p className="text-sm text-green-500 font-bold">
                                                        {startsFromSelectedStop ? "in partenza" : "in arrivo"}
                                                    </p>
                                                </motion.div>
                                                <p className="text-sm">
                                                    {trip.stopTimes[0].stopId === trip.stopId ? "da" : "a"} {trip.stopName}
                                                </p>
                                            </div>) : (<p className="text-sm">
                                                {startsFromSelectedStop ? "parte da" : "ferma a"} {trip.stopName}
                                            </p>)}
                                        </div>)}
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>)
            })}
        </AnimatePresence>
    </div>)
}