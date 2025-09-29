import axios from "axios";

export async function getStationId(name: string) {
    const {
        data,
        status
    } = await axios.get(`https://www.lefrecce.it/Channels.Website.BFF.WEB/website/locations/search?name=${name}&limit=1`);
    if (data.length === 0 || status !== 200) return null;
    return data[0].id;
}

export async function getTrips(origin: string, destination: string, date: string) {
    const {data} = await axios.post("https://www.lefrecce.it/Channels.Website.BFF.WEB/website/ticket/solutions", {
        departureLocationId: origin,
        arrivalLocationId: destination,
        departureTime: new Date(date),
        "adults": 1,
        "children": 0,
        "criteria": {
            "frecceOnly": false,
            "regionalOnly": false,
            "intercityOnly": false,
            "tourismOnly": false,
            "noChanges": false,
            "order": "DEPARTURE_DATE",
            "offset": 0,
            "limit": 10
        },
        "advancedSearchRequest": {
            "bestFare": false,
            "bikeFilter": false
        }
    });
    if (data.length === 0) return null;
    return data;
}