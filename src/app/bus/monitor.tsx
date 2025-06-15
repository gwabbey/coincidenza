"use client"

import { getDelayColor } from "@/utils"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

function getStopsAway(selectedStopId: number, stopTimes: any[], currentStopId: number) {
    const currentIndex = stopTimes.findIndex(s => s.stopId === currentStopId);
    const selectedIndex = stopTimes.findIndex(s => s.stopId === selectedStopId);

    if (currentIndex === -1 || selectedIndex === -1) return null;

    const diff = selectedIndex - currentIndex;
    return diff >= 0 ? diff : null;
}

export function Monitor({ trips }: { trips: any[] }) {
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

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
                {trips.map((trip) => {
                    const scheduledTime = new Date(trip.oraArrivoProgrammataAFermataSelezionata)
                    const effectiveTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata)
                    const currentTime = new Date()

                    const timeUntilScheduled = (scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60)
                    const timeUntilEffective = (effectiveTime.getTime() - currentTime.getTime()) / (1000 * 60)
                    const timeUntilArrival = effectiveTime && !isNaN(effectiveTime.getTime()) ? timeUntilEffective : timeUntilScheduled

                    const stopsAway = getStopsAway(trip.stopId, trip.stopTimes, trip.stopNext)

                    let arriving = false

                    // Check if bus is tracked (has real-time data)
                    if (trip.lastEventRecivedAt !== null) {
                        // Bus is tracked - use sequence detection
                        const selectedStop = trip.stopTimes.find((s: any) => s.stopId === trip.stopId)
                        const selectedStopSequence = selectedStop ? selectedStop.stopSequence : null

                        if (selectedStopSequence !== null && trip.lastSequenceDetection > 0) {
                            // Find the previous stop sequence
                            const previousStopSequence = selectedStopSequence - 1

                            // Show arriving if bus is at previous stop or beyond (but hasn't passed selected stop)
                            arriving = trip.lastSequenceDetection >= previousStopSequence && trip.lastSequenceDetection <= selectedStopSequence
                        }
                    } else {
                        // Bus is not tracked - use time-based logic
                        // Show arriving if 2 minutes or less until departure, and keep showing even after departure
                        const selectedStop = trip.stopTimes.find((s: any) => s.stopId === trip.stopId)
                        if (selectedStop) {
                            const [h, m, s] = selectedStop.departureTime.split(":").map(Number)
                            const departure = new Date(currentTime)
                            departure.setHours(h, m, s, 0)

                            // Add delay if present
                            if (trip.delay !== null && !isNaN(trip.delay)) {
                                departure.setMinutes(departure.getMinutes() + trip.delay)
                            }

                            const timeUntilDeparture = (departure.getTime() - currentTime.getTime()) / (1000 * 60)

                            // Show arriving if 2 minutes or less until departure (including past departures)
                            arriving = timeUntilDeparture <= 2
                        }
                    }
                    const isDelayed = trip.delay !== null

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
                                    <div className="flex items-center justify-center w-full max-w-16 p-2 text-lg font-bold text-center rounded-small bg-gray-500 text-white self-center">
                                        {scheduledTime.toLocaleTimeString('it-IT', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>

                                    <div className="flex flex-col text-left w-full flex-grow min-w-0">
                                        <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                            <Link href={`/track/trentino-trasporti/${trip.tripId}`}>
                                                <div className="flex items-center gap-x-1 sm:gap-x-2">
                                                    <div className={`text-base sm:text-lg font-bold text-center rounded-small max-w-fit ${!trip.route?.routeColor && trip.type === "U" ? "bg-success text-white" : "bg-primary text-white"}`} style={{
                                                        backgroundColor: trip.route && trip.route.routeColor ? `#${trip.route.routeColor}` : "",
                                                        padding: "0.1rem 0.5rem"
                                                    }}>
                                                        {trip.route.routeShortName}
                                                    </div>
                                                    <div className="font-bold text-base sm:text-lg truncate min-w-0 flex-grow">
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