import {getMonitor, getVtId} from "@/api/trenitalia/monitor";
import stations from "@/stations.json";
import {Spinner} from "@heroui/react";
import {notFound} from "next/navigation";
import {Suspense} from 'react';
import Search from "../search";
import {Monitor} from "./monitor";

async function MonitorSuspense({rfiId, vtId}: { rfiId: string, vtId: string }) {
    const monitor = await getMonitor(rfiId, vtId);
    if (!monitor) {
        return (
            <div className="text-center text-lg text-foreground-500 font-bold p-4">
                i dati da questa stazione non sono disponibili al momento. riprova più tardi.
            </div>
        )
    }
    return <Monitor monitor={monitor} />;
}

export default async function Page({
                                       params,
                                   }: {
    params: Promise<{ id: string }>
}) {
    const rfiId = (await params).id;
    const name = (stations as Record<string, string>)[rfiId];
    const vtId = await getVtId(name);

    if (!(stations as Record<string, string>)[rfiId]) return notFound();

    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">Partenze da {name}</h1>
            <Search selected={rfiId} />
            <Suspense fallback={
                <div className="flex-col py-4">
                    <Spinner color="default" size="lg" />
                    <p className="text-center text-foreground-500 text-lg">caricamento in corso...</p>
                </div>
            }>
                <MonitorSuspense rfiId={rfiId} vtId={vtId} />
            </Suspense>
        </div>
    );
}