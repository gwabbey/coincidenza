"use server"
import axios from "axios";

export async function searchStation(query: string) {
    const {data} = await axios.get("https://photon.komoot.io/api?osm_tag=railway%3Astation&osm_tag=railway%3Ahalt", {
        params: {
            q: query, lat: 46.072438, lon: 11.119065, bbox: "5.778809,36.438961,18.764648,47.886881", limit: 1
        }
    });
    if (!data) return [];
    return data;
}

export async function reverseGeocode(lat: number, lon: number) {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
    const props = response.data;
    if (!props) return "Posizione salvata";
    return `${props.name || props.address.road || props.address.suburb || props.address.town}${props.address.city ? `, ${props.address.city}` : props.address.village ? `, ${props.address.village}` : ""}`;
}