import {cookies} from "next/headers";
import {Suspense} from "react";

import {reverseGeocode} from "@/api/motis/geocoding";
import {getFilteredDepartures} from "@/api/trentino-trasporti/api";

import {Search} from "./search";
import {Monitor} from "@/app/bus/monitor";
import RequestLocation from "@/app/location";
import Loading from "@/components/loading";

async function Departures({lat, lon}: { lat: string; lon: string }) {
    const {error, trips} = await getFilteredDepartures(lat, lon);

    if (error === "no_stops") {
        return (<div className="py-4 text-center">
            <h2 className="text-xl font-bold mb-2">nessuna fermata trovata</h2>
            <p className="text-foreground-500">
                non è stata trovata alcuna fermata vicino alla posizione fornita
            </p>
        </div>);
    }

    if (trips.length === 0) {
        return (<div className="py-8 text-center text-foreground-500">
            nessuna corsa in partenza al momento
        </div>);
    }

    return <Monitor trips={trips} />;
}

export default async function Page() {
    const cookieStore = await cookies();
    const lat = cookieStore.get("lat")?.value || cookieStore.get("userLat")?.value;
    const lon = cookieStore.get("lon")?.value || cookieStore.get("userLon")?.value;
    const name = cookieStore.get("name")?.value;
    const rejected = cookieStore.get("locationRejected")?.value === "true";

    const hasLocation = Boolean(lat && lon);
    const closest = hasLocation ? await reverseGeocode(lat!, lon!) : [];

    return (<div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">Partenze</h1>

        <Search lat={lat ?? ""} lon={lon ?? ""} name={name ?? ""} closest={closest} />

        <div className="flex flex-col items-center justify-center text-center">
            {!hasLocation && (<>
                {!rejected ? (<Loading />) : (<div className="py-4">
                    <p className="text-lg font-semibold">
                        posizione non rilevata!
                    </p>
                    <p className="text-foreground-500">
                        puoi cercare manualmente o dare i permessi per la posizione
                    </p>
                </div>)}

                <RequestLocation />
            </>)}

            {hasLocation && (<Suspense key={`${lat}-${lon}`} fallback={<Loading />}>
                <Departures lat={lat!} lon={lon!} />
            </Suspense>)}
        </div>
    </div>);
}