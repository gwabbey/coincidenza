import { getMonitor } from "@/api/trenitalia/monitor";
import stations from "@/stations.json";
import { Spinner } from "@heroui/react";
import { notFound } from "next/navigation";
import { Suspense } from 'react';
import Search from "../search";
import { Monitor } from "./monitor";

async function MonitorSuspense({ id }: { id: string }) {
    const monitor = await getMonitor(id);
    return <Monitor monitor={monitor} />;
}

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    if (!(stations as Record<string, string>)[id]) return notFound();

    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">partenze da {(stations as Record<string, string>)[id]}</h1>
            <Search selected={id} />
            <Suspense fallback={
                <div className="flex-col py-4">
                    <Spinner color="default" size="lg" />
                    <p className="text-center text-gray-500 text-lg">caricamento in corso...</p>
                </div>
            }>
                <MonitorSuspense id={id} />
            </Suspense>
        </div>
    );
}