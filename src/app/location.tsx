'use client'

import {getUserLocation} from '@/components/geolocation'
import {useRouter} from 'next/navigation'
import {useEffect} from 'react'

export default function RequestLocation() {
    const router = useRouter()

    useEffect(() => {
        getUserLocation()
            .then(({lat, lon}) => {
                document.cookie = `userLat=${lat}; path=/; max-age=1800`
                document.cookie = `userLon=${lon}; path=/; max-age=1800`
                document.cookie = `locationRejected=false; path=/; max-age=1800`
            })
            .finally(() => {
                window.location.reload()
            })
    }, [router])

    return null
}