import {getRfiAlerts} from "@/api/trenitalia/api";
import {cookies} from "next/headers";
import RequestLocation from "@/app/location";
import {Home} from "@/components/home";

export default async function Page() {
    const cookieStore = await cookies();
    const favorites = JSON.parse(decodeURIComponent(cookieStore.get('favorites')?.value ?? '[]'));
    const userLat = cookieStore.get("userLat")?.value ?? "";
    const userLon = cookieStore.get("userLon")?.value ?? "";
    const alerts = await getRfiAlerts(["Trentino Alto Adige"]);

    let rfiId = "";
    let vtId = "";

    return (<>
        <Home alerts={alerts} favorites={favorites} />
        {!userLat || !userLon || !rfiId || !vtId && (<RequestLocation />)}
    </>);
}