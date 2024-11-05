import Stops from "@/components/Stops";
import Location from "@/components/Location";
import {cookies} from "next/headers";
import {getClosestBusStops, getStop} from "@/api";
import {Suspense} from "react";
import {Center, Loader} from "@mantine/core";
import Routes from "@/components/Routes";

export default async function Page() {
    const lat = (await cookies()).get('lat');
    const lon = (await cookies()).get('lon');
    const id = (await cookies()).get('id');
    const type = (await cookies()).get('type');

    if (!lat || !lon) {
        return <Location />;
    }

    const stops = await getClosestBusStops(parseFloat(lat.value), parseFloat(lon.value));

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
            <Stops stops={stops} id={id?.value} type={type?.value} />
            <Suspense fallback={
                <Center w="100%">
                    <Loader size="xl" />
                </Center>
            }>
                {stop && stop.length > 0 && (
                    <Routes stop={stop} currentStop={id?.value ?? null} />
                )}
            </Suspense>
        </div>
    );
}