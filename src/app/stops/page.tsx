import {getClosestBusStops} from "@/api";
import Location from "@/components/Location";
import Stops from "@/components/Stops";

export default async function Page({searchParams}: { searchParams: { lat?: string, lon?: string } }) {
    const {lat, lon} = searchParams;

    if (!lat || !lon) {
        return <Location />;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const stops = await getClosestBusStops(latitude, longitude);

    return (
        <Stops stops={stops} />
    );
}