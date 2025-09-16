import axios from "axios";

export async function getTrips(origin: string, destination: string, date: string) {
    const {data} = await axios.post("https://www.lefrecce.it/Channels.Website.BFF.WEB/website/ticket/solutions", {
        body: JSON.stringify({
            departureLocationId: origin,
            arrivalLocationId: destination,
            departureTime: date,
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
        })
    });
    if (data.length === 0) return null;
    return data;
}