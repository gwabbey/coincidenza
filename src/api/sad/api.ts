"use server";

import axios from 'axios';

export async function searchStation(query: string) {
    const baseUrl = 'https://efa.sta.bz.it/web/XML_STOPFINDER_REQUEST';
    const params = new URLSearchParams({
        language: 'it',
        coordOutputFormat: 'WGS84[DD.ddddd]',
        locationServerActive: '1',
        useHouseNumberList: 'false',
        type_sf: 'any',
        name_sf: `stazione ${query}`,
        odvSugMacro: 'true',
        outputFormat: 'JSON',
        outputEncoding: 'UTF-8'
    });

    const { data } = await axios.get(`${baseUrl}?${params}`);

    if (!data) return [];
}