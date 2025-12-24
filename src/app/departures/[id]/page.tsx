import {notFound} from "next/navigation";
import {Suspense} from 'react';
import Search from "../search";
import Loading from "@/components/loading";
import {getFilteredDepartures} from "@/api/trentino-trasporti/api";
import {getStop} from "@/api/motis/geocoding";
import {getMonitor, getVtId} from "@/api/trenitalia/monitor";
import stations from "@/stations.json";
import {Train} from "./train";
import {Bus} from "./bus";
import {capitalize} from "@/utils";

export const revalidate = 60

type MonitorProps = {
    agency: string; id: string; name: string; lat?: string; lon?: string;
};

const idAgencies = new Set(["rfi"]);

async function MonitorSuspense({agency, id, name, lat, lon}: MonitorProps) {
    if (idAgencies.has(agency)) {
        const vtId = await getVtId(name);
        const monitor = await getMonitor(id, vtId);

        if (!monitor) return notFound();

        return <Train monitor={monitor} />
    } else {
        if (!lat || !lon) return notFound();

        const {trips} = await getFilteredDepartures(lat, lon);

        if (!trips) {
            return (<div className="text-center text-lg text-foreground-500 font-bold p-4">
                dati non disponibili al momento. riprova più tardi.
            </div>);
        }
        return <Bus trips={trips} />
    }
}

export default async function Page({params}: { params: Promise<{ id: string }> }) {
    const fullId = (await params).id;
    const [agency, ...rest] = fullId.split("_");
    const id = rest.join("_");

    let name: string;
    let lat: string | undefined;
    let lon: string | undefined;

    if (idAgencies.has(agency)) {
        const stationName = (stations as Record<string, string>)[id];
        if (!stationName) return notFound();
        name = stationName;
    } else {
        const stop = await getStop(fullId);
        if (!stop) return notFound();
        name = stop.name;
        lat = stop.lat;
        lon = stop.lon;
    }
    
    name = capitalize(name);

    return (<div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Partenze da {name}</h1>
        <Search selected={fullId} selectedName={name} />
        <Suspense fallback={<Loading />}>
            <MonitorSuspense agency={agency} id={id} name={name} lat={lat} lon={lon} />
        </Suspense>
    </div>);
}