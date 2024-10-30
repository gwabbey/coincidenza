import Stops from "@/components/Stops";
import Location from "@/components/Location";
import {cookies} from "next/headers";
import {getClosestBusStops, getStop} from "@/api";

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
        <div>
            <Stops stops={stops} />
            {stop && stop.length > 0 && (
                <div>
                    <h2>Stop Details</h2>
                    <p>{JSON.stringify(stop)}</p>
                </div>
            )}
        </div>
    );
}