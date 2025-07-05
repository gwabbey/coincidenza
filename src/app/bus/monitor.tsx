"use client"

import { TimeDisplay } from "@/components/time"
import { getDelayColor } from "@/utils"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
    if (passedIndex === -1) return selectedIndex + 1; // none passed yet

    const stopsAway = selectedIndex - passedIndex;
    return stopsAway <= 0 ? 0 : stopsAway; // never negative
}

export function Monitor({ trips }: { trips: any[] }) {
    const router = useRouter()
    const [blinkKey, setBlinkKey] = useState(0)
    const [showRelativeTime, setShowRelativeTime] = useState(false)

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

    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = []

        timeouts.push(setTimeout(() => {
            setShowRelativeTime(true)
        }, 1000))

        timeouts.push(setTimeout(() => {
            setShowRelativeTime(false)

            const interval = setInterval(() => {
                setShowRelativeTime(prev => !prev)
            }, 5000)
            timeouts.push(interval)
        }, 3000))

        return () => timeouts.forEach(clearTimeout)
    }, [])

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
                {trips.map((trip) => {
                    let arriving = false
                    const isDelayed = trip.delay !== null
                    const scheduledTime = new Date(trip.oraArrivoProgrammataAFermataSelezionata)
                    const effectiveTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata)
                    const currentTime = new Date()

                    const stopsAway = getStopsAway(trip.stopId, trip.stopTimes, trip.delay)
                    const selectedStop = trip.stopTimes.find((s: any) => s.stopId === trip.stopId);
                    const selectedSequence = selectedStop?.stopSequence ?? null;

                    if (trip.lastEventRecivedAt !== null && selectedSequence !== null) {
                        const prevSequence = selectedSequence - 1;
                        if (trip.lastSequenceDetection >= prevSequence && trip.lastSequenceDetection <= selectedSequence) {
                            arriving = true;
                        }
                    } else if (selectedStop) {
                        const [h, m, s] = selectedStop.departureTime.split(":").map(Number);
                        const departure = new Date(currentTime);
                        departure.setHours(h, m, s, 0);

                        if (trip.delay != null && !isNaN(trip.delay)) {
                            departure.setMinutes(departure.getMinutes() + trip.delay);
                        }

                        const timeUntilDeparture = (departure.getTime() - currentTime.getTime()) / (1000 * 60);
                        if (stopsAway === 0 || timeUntilDeparture <= 2) {
                            arriving = true;
                        }
                    }

                    return (
                        <motion.div
                            key={trip.tripId}
                            layoutId={trip.tripId}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <div className="flex flex-row justify-between gap-4">
                                <div className="flex gap-2 w-full">
                                    <TimeDisplay
                                        scheduledTime={scheduledTime}
                                        effectiveTime={effectiveTime}
                                        showRelativeTime={showRelativeTime}
                                    />

                                    <div className="flex flex-col text-left w-full flex-grow min-w-0">
                                        <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                            <Link href={`/track/trentino-trasporti/${trip.tripId}`} className="font-bold text-base sm:text-lg truncate min-w-0 flex-grow">
                                                <div className="flex items-center gap-x-1 sm:gap-x-2">
                                                    <div className={`text-base sm:text-lg font-bold text-center rounded-small max-w-fit ${!trip.route?.routeColor && trip.type === "U" ? "bg-success text-white" : "bg-primary text-white"}`} style={{
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
                                            {isDelayed && (
                                                <p className={`text-lg font-bold uppercase flex-shrink-0 whitespace-nowrap text-${getDelayColor(trip.delay)}`}>
                                                    {trip.delay < 0 ? '' : trip.delay > 0 ? '+' : ""}
                                                    {trip.delay !== 0 && `${trip.delay}'`}
                                                </p>
                                            )}
                                        </div>

                                        <Link
                                            className="text-sm text-gray-500"
                                            href={`/track/trentino-trasporti/${trip.tripId}`}
                                        >
                                            {stopsAway ? (
                                                <>a <strong>{stopsAway}</strong> fermat{stopsAway > 1 ? 'e' : 'a'} da {trip.stopName}</>
                                            ) : (
                                                <div className="flex items-center gap-1 whitespace-pre">
                                                    {arriving ? (
                                                        <div className="flex items-center gap-1 whitespace-pre">
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
                                                                <p className="text-sm text-green-500 font-bold">
                                                                    {trip.stopTimes[0].stopId === trip.stopId ? "in partenza" : "in arrivo"}
                                                                </p>
                                                            </motion.div>
                                                            <p className="text-sm">
                                                                {trip.stopTimes[0].stopId === trip.stopId ? "da" : "a"} {trip.stopName}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>{trip.stopTimes[0].stopId === trip.stopId ? "parte da" : "passa per"} {trip.stopName}</>
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}