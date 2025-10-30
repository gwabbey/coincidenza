import axios from "axios";

export async function getNearbyStation(lat: number, lon: number): Promise<string | null> {
    try {
        const {data, status} = await axios.get(
            `https://int.bahn.de/web/api/reiseloesung/orte/nearby?lat=${lat}&long=${lon}&radius=9999&maxNo=1`
        );

        if (status !== 200 || data.length === 0) {
            return null;
        }

        return data[0].name;
    } catch (error) {
        console.error("Error fetching nearby station:", error);
        return null;
    }
}