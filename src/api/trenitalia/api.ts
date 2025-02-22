"use server";

import axios from "axios";

export async function searchStation(query: string) {
    const response = await axios.get(`https://app.lefrecce.it/Channels.Website.BFF.WEB/app/locations?name=${query}&limit=1&multi=false`);
    return response.data;
}