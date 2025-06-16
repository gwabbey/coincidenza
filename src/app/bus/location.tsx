'use client'

import { getUserLocation } from '@/components/geolocation'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RequestLocation() {
    const router = useRouter()

    useEffect(() => {
        getUserLocation()
            .then(({ lat, lon }) => {
                document.cookie = `userLat=${lat}; path=/`
                document.cookie = `userLon=${lon}; path=/`
                document.cookie = `locationRejected=false; path=/`
            })
            .catch(() => {
                document.cookie = `locationRejected=true; path=/`
            })
            .finally(() => {
                window.location.reload()
            })
    }, [router])

    return null
}