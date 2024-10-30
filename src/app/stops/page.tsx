import {getClosestBusStops} from "@/api";
import Location from "@/components/Location";
import {Select} from "@mantine/core";

export default async function Page({searchParams}: { searchParams: { lat?: string, lon?: string } }) {
    const {lat, lon} = searchParams;

    if (!lat || !lon) {
        // TODO: make Location component prettier lol
        return <Location />;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const stops = await getClosestBusStops(latitude, longitude);

    return (
        <Select
            data={stops.map((stop: { stopName: string; stopCode: string; }) => `${stop.stopName} (${stop.stopCode})`)}
            placeholder="Seleziona una stazione"
            label="Stazione"
            limit={15}
            searchable
            clearable />
    );
}