"use client"

import { AnimatePresence, motion } from "motion/react"

interface TimeDisplayProps {
    scheduledTime: Date
    effectiveTime: Date
    showRelativeTime: boolean
}

function formatRelativeTime(minutes: number): string {
    if (minutes <= 1) {
        return "ora"
    }

    if (minutes < 60) {
        return `${Math.round(minutes)}m`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)

    if (remainingMinutes === 0) {
        return `${hours}h`
    }

    return `${hours}h${remainingMinutes}m`
}

export function TimeDisplay({ scheduledTime, effectiveTime, showRelativeTime }: TimeDisplayProps) {
    const currentTime = new Date()
    const timeUntilEffective = (effectiveTime.getTime() - currentTime.getTime()) / (1000 * 60)
    const timeUntilScheduled = (scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60)
    const timeUntilArrival = effectiveTime && !isNaN(effectiveTime.getTime()) ? timeUntilEffective : timeUntilScheduled

    const relativeTimeString = formatRelativeTime(timeUntilArrival)
    const scheduledTimeString = scheduledTime.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <div className="flex items-center justify-center w-full max-w-16 p-2 text-lg font-bold text-center rounded-small bg-gray-500 text-white self-center min-h-[2.5rem]">
            <AnimatePresence mode="wait">
                <motion.span
                    key={showRelativeTime ? 'relative' : 'absolute'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="whitespace-nowrap"
                >
                    {showRelativeTime ? (
                        <span className="text-base">{relativeTimeString}</span>
                    ) : (
                        scheduledTimeString
                    )}
                </motion.span>
            </AnimatePresence>
        </div>
    )
}