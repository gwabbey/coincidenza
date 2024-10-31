import Stops from "@/components/Stops";
import Location from "@/components/Location";
import {cookies} from "next/headers";
import {getClosestBusStops, getStop} from "@/api";
import Routes from "@/components/Routes";
import {Suspense} from "react";

export default async function Page() {
    const lat = (await cookies()).get('lat');
    const lon = (await cookies()).get('lon');

    if (!lat || !lon) {
        return <Location />;
    }

    const stops = await getClosestBusStops(parseFloat(lat.value), parseFloat(lon.value));

    const id = (await cookies()).get('id');
    const type = (await cookies()).get('type');

    let stop;
    if (id && type) {
        stop = await getStop(id.value, type.value);
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
        }}>
            <Stops stops={stops} />
            <Suspense fallback={<p>Caricamento...</p>}>
                {stop && stop.length > 0 && (
                    <Routes route={stop} currentStop={id?.value ?? null} />
                )}
            </Suspense>
        </div>
    );
}