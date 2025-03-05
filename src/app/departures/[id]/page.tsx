import { getStationMonitor } from "@/api/trenitalia/api";
import Search from "../search";
import stations from "../stations.json";
import { Monitor } from "./monitor";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const monitor = await getStationMonitor(id);

    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-4xl font-bold">partenze da {(stations as Record<string, string>)[id]}</h1>
            <Search selected={id} />
            <Monitor monitor={monitor} />
        </div>
    )
}