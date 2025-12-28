import {notFound} from "next/navigation";
import {Suspense} from "react";
import Search from "../search";
import Loading from "@/components/loading";
import {getStop} from "@/api/motis/geocoding";
import stations from "@/stations.json";
import {capitalize} from "@/utils";
import {getMonitor, getVtId} from "@/api/trenitalia/monitor";
import {Train} from "./train";
import {getFilteredDepartures} from "@/api/trentino-trasporti/api";
import {Bus} from "./bus";

export const revalidate = 60;

type StopContext = | { kind: "train"; agency: "rfi"; id: string; name: string } | {
    kind: "bus";
    agency: "tte" | "ttu";
    id: string;
    name: string;
    lat: string;
    lon: string
};

async function TrainLoader({id, name}: { id: string; name: string }) {
    const vtId = await getVtId(name);
    const departures = await getMonitor(id, vtId);

    if (!departures) return notFound();

    return <Train departures={departures} />;
}

async function BusLoader({lat, lon}: { lat: string; lon: string }) {
    const departures = await getFilteredDepartures(lat, lon);

    if (!departures) {
        return (<div className="text-center text-lg text-foreground-500 font-bold p-4">
            dati non disponibili al momento. riprova più tardi.
        </div>);
    }

    return <Bus departures={departures} />;
}

async function resolveStop(fullId: string): Promise<StopContext | null> {
    const [agency, ...rest] = fullId.split("_");
    const id = rest.join("_");

    if (agency === "rfi") {
        const name = (stations as Record<string, string>)[id];
        if (!name) return null;
        return {kind: "train", agency, id, name: capitalize(name)};
    }

    if (agency === "tte" || agency === "ttu") {
        const stop = await getStop(fullId);
        if (!stop) return null;
        return {
            kind: "bus", agency, id, name: capitalize(stop.name), lat: stop.lat, lon: stop.lon,
        };
    }

    return null;
}

export default async function Page({params}: { params: Promise<{ id: string }> }) {
    const fullId = (await params).id;
    const stop = await resolveStop(fullId);
    if (!stop) return notFound();

    return (<div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Partenze da {stop.name}</h1>

        <Search selected={fullId} selectedName={stop.name} />

        <Suspense fallback={<Loading />}>
            {stop.kind === "train" ? (<TrainLoader id={stop.id} name={stop.name} />) : (
                <BusLoader lat={stop.lat} lon={stop.lon} />)}
        </Suspense>
    </div>);
}