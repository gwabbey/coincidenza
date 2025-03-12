import { getMonitor } from "@/api/trenitalia/monitor";
import stations from "@/stations.json";
import Search from "../search";
import { Monitor } from "./monitor";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    const monitor = await getMonitor(id);

    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">partenze da {(stations as Record<string, string>)[id]}</h1>
            <Search selected={id} />
            <Monitor monitor={monitor} />
        </div>
    )
}