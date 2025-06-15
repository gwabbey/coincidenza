import axios from "axios";

export async function reverseGeocode(lat: number, lon: number) {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
    const props = response.data;
    if (!props) return "Posizione salvata";
    return `${props.name || props.address.road || props.address.suburb || props.address.town}${props.address.city ? `, ${props.address.city}` : props.address.village ? `, ${props.address.village}` : ""}`;
}