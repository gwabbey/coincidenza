import {getClosestBusStops, getStopDepartures} from '@/api/trentino-trasporti/api'
import {cookies} from 'next/headers'
import {Suspense} from 'react'
import RequestLocation from '../location'
import {Monitor} from './monitor'
import Loading from "@/components/loading";

interface BusStop {
    stopId: number
    stopName: string
    stopLat: number
    stopLon: number
    distance: number
    type: string
}

interface Trip {
    tripId: string
    routeId: number
    tripHeadsign: string
    oraArrivoProgrammataAFermataSelezionata: string
    oraArrivoEffettivaAFermataSelezionata: string
    delay: number
    type: string
    stopId: number
    stopName: string
    distance: number
    matricolaBus?: number
    wheelchairAccessible?: number
    stopLast: number
    stopNext: number
    stopTimes: {
        arrivalTime: string
        departureTime: string
        stopId: number
        stopName: string
        stopSequence: number
    }[]
}

function getNearbyStops(stops: BusStop[], radiusKm: number = 1): BusStop[] {
    const nearby = stops.filter(stop => stop.distance <= radiusKm);
    if (nearby.length === 0 && radiusKm < 10) {
        return getNearbyStops(stops, radiusKm * 2);
    }
    return nearby;
}

function filterTrips(trips: Trip[]): Trip[] {
    const seen = new Set<string>();
    const now = new Date();

    return trips.filter(trip => {
        if (seen.has(trip.tripId)) return false;
        seen.add(trip.tripId);

        if (trip.stopTimes[trip.stopTimes.length - 1].stopId === trip.stopId) return false;

        const selectedStop = trip.stopTimes.find(s => String(s.stopId) === String(trip.stopId));
        if (!selectedStop) return false;

        const [h, m, s] = selectedStop.departureTime.split(":").map(Number);
        const departure = new Date(now);
        departure.setHours(h, m, s, 0);

        if (trip.delay) {
            departure.setMinutes(departure.getMinutes() + trip.delay);
        }

        const diff = now.getTime() - departure.getTime();

        return !(diff > 120000 && trip.stopNext !== trip.stopId);
    });
}

function sortTripsByDepartureTime(trips: Trip[]): Trip[] {
    return trips.sort((a, b) => {
        const timeA = new Date(a.oraArrivoProgrammataAFermataSelezionata).getTime()
        const timeB = new Date(b.oraArrivoProgrammataAFermataSelezionata).getTime()
        return timeA - timeB
    })
}

async function Departures({userLat, userLon}: { userLat: number, userLon: number }) {
    try {
        const allStops = await getClosestBusStops(userLat, userLon)
        const walkableStops = getNearbyStops(allStops, 0.1)

        if (walkableStops.length === 0) {
            return (<div className="flex-col text-center py-4">
                <h2 className="text-xl font-bold mb-2">nessuna fermata trovata</h2>
                <p className="text-foreground-500">non è stata trovata alcuna fermata vicino alla posizione fornita</p>
            </div>)
        }

        const departurePromises = walkableStops.map(async (stop) => {
            try {
                const departures = await getStopDepartures(stop.stopId, stop.type)

                if (!departures) return []

                return departures.map((trip: any) => ({
                    ...trip, stopId: stop.stopId, stopName: stop.stopName, distance: stop.distance
                }))
            } catch (error) {
                console.error(`Error fetching departures for stop ${stop.stopId}:`, error)
                return []
            }
        })

        const allDeparturesArrays = await Promise.all(departurePromises)
        const allDepartures = allDeparturesArrays.flat()

        const uniqueTrips = filterTrips(allDepartures)
        const sortedTrips = sortTripsByDepartureTime(uniqueTrips)

        return sortedTrips.length === 0 ? (<div className="text-center py-8">
            <p className="text-foreground-500">nessuna corsa in partenza al momento</p>
        </div>) : (<Monitor trips={sortedTrips} />)

    } catch (error) {
        return (<div className="flex-col text-center py-4">
            <h2 className="text-xl font-bold mb-2">errore</h2>
            <p className="text-foreground-500">c'è stato un problema :( torna più tardi!</p>
        </div>)
    }
}

export default async function Page() {
    const cookieStore = await cookies()
    const lat = cookieStore.get('userLat')?.value
    const lon = cookieStore.get('userLon')?.value
    const rejected = cookieStore.get('locationRejected')?.value === 'true'

    if (!lat || !lon) {
        return (<div className="flex flex-col items-center justify-center py-8 text-center">
            {!rejected ? (<Loading />) : (<div className="flex-col py-4">
                <p className="text-lg font-semibold">posizione non rilevata!</p>
                <p className="text-foreground-500">puoi cercare un luogo manualmente o dare i permessi per la
                    posizione</p>
            </div>)}
            <RequestLocation />
        </div>)
    }

    const userLat = parseFloat(lat)
    const userLon = parseFloat(lon)

    return (<div className="flex flex-col items-center justify-center text-center">
        <Suspense fallback={<Loading />}>
            <Departures userLat={userLat} userLon={userLon} />
        </Suspense>
    </div>)
}