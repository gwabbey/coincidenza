import {getClosestStation, getRfiAlerts, getRfiNotices} from "@/api/trenitalia/api";
import {cookies} from "next/headers";
import {getMonitor} from "@/api/trenitalia/monitor";
import Home from "./home";

export default async function Page() {
    const cookieStore = await cookies();
    const favorites = JSON.parse(decodeURIComponent(cookieStore.get('favorites')?.value ?? '[]'));
    const userLat = cookieStore.get('userLat')?.value ?? "";
    const userLon = cookieStore.get('userLon')?.value ?? "";
    const {rfiId, vtId} = getClosestStation(Number(userLat), Number(userLon));

    const departures = await getMonitor(rfiId, vtId);
    const alerts = await getRfiAlerts(["Trentino Alto Adige", "Veneto"]);
    const notices = await getRfiNotices(["Trentino Alto Adige"]);

    return (
        <Home
            favorites={favorites}
            userLat={userLat}
            userLon={userLon}
            rfiId={rfiId}
            vtId={vtId}
            departures={departures}
            alerts={alerts}
            notices={notices}
        />
    );
}