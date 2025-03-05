"use server";

import { trainCategoryShortNames } from "@/train-categories";
import { capitalize } from "@/utils";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { StationMonitor, Train, TrainStop, Trip } from "./types";

export async function searchStation(query: string) {
    const { data } = await axios.get(`https://app.lefrecce.it/Channels.Website.BFF.WEB/app/locations?name=${query}&limit=5&multi=false`);
    return data;
}

export async function getTripSmartCaring(code: string, origin: string, date: string) {
    const { data } = await axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/news/smartcaring?commercialTrainNumber=${code}&originCode=${origin}&searchDate=${date}`);
    if (data.length === 0) return null;
    return data;
}

export async function getTripCanvas(code: string, origin: string, date: string) {
    const { data } = await axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/tratteCanvas/${origin}/${code}/${date}`);
    if (data.length === 0) return null;
    return data;
}

export async function getTrip(id: string) {
    const { data } = await axios.get(
        `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete/${id}`
    );

    if (data.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parsed = data
        .trim()
        .split("\n")
        .map((line: string) => {
            const parts = line.split("|");
            if (parts.length < 2) return null;

            const [left, right] = parts;
            const [code, destination] = left.split(" - ");
            const rightParts = right.split("-");

            if (rightParts.length < 3) return null;

            const [origin, timestampStr] = rightParts.slice(-2);
            const timestamp = Number(timestampStr);

            if (isNaN(timestamp)) return null;

            const tripDate = new Date(timestamp);
            tripDate.setHours(0, 0, 0, 0);

            return {
                code: code.trim(),
                destination: capitalize(destination.trim()),
                origin: origin.trim(),
                timestamp,
                tripDate,
            };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.tripDate.getTime() - b.tripDate.getTime());

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const todayTrip = parsed.find((trip: Trip) => {
        const tripDate = new Date(trip.orarioPartenza);
        return tripDate.toDateString() === now.toDateString();
    });

    const selectedTrip = parsed[0].timestamp < oneHourAgo.getTime() && todayTrip
        ? todayTrip
        : parsed[0];

    const { code, origin, timestamp } = selectedTrip;
    const formattedDate = new Intl.DateTimeFormat("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
        .format(new Date())
        .split("/")
        .reverse()
        .join("-");

    const trip = await axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${origin}/${code}/${timestamp}`);
    if (trip.data.categoria === "REG") trip.data.categoria = "R";
    const info = await getTripSmartCaring(code, origin, formattedDate);
    const canvas = await getTripCanvas(code, origin, timestamp);
    return { ...trip.data, info, canvas };
}

export async function getStationMonitor(id: string): Promise<StationMonitor> {
    try {
        const client = axios.create();

        axiosRetry(client, {
            retries: 5,
            retryDelay: axiosRetry.exponentialDelay,
            onRetry: (retryCount, error) => {
                console.error(
                    `Retry attempt ${retryCount} for error ${error.response?.statusText}`
                );
            },
        });

        const response = await client.get(
            `https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${id}&arrivals=False`
        );
        const $ = cheerio.load(response.data);

        const trains: Train[] = [];
        const alerts = $('#barraInfoStazioneId > div')
            .find('div[class="marqueeinfosupp"] div')
            .text()
            .trim();

        $('#bodyTabId > tr').each((_, element) => {
            const category = $(element)
                .find('td[id="RCategoria"] img')
                .attr('alt')
                ?.replace('Categoria ', '')
                .replace('CIVITAVECCHIA EXPRESS ', '')
                .toLowerCase()
                .trim() || null;

            const number = $(element).find('td[id="RTreno"]').text().trim();
            const destination = $(element).find('td[id="RStazione"] div').text().toLowerCase().trim();
            const departureTime = $(element).find('td[id="ROrario"]').text().trim();
            const delay = $(element).find('td[id="RRitardo"]').text().trim() || '0';
            const platform = category === "autocorsa"
                ? "Piazzale Ferrovia"
                : $(element).find('td[id="RBinario"] div').text().trim();
            const departing =
                $(element).find('td[id="RExLampeggio"] img').attr('alt')?.toLowerCase().trim() === "si";

            const getShortCategory = (category: string | null): string | null => {
                if (!category) return null;
                if (category.startsWith('suburbano')) return category.split(' ')[1];
                if (category.startsWith('servizio ferroviario metropolitano')) {
                    return category.replace('servizio ferroviario metropolitano linea', 'SFM');
                }
                return trainCategoryShortNames[category as keyof typeof trainCategoryShortNames] || "Treno";
            };

            const shortCategory = getShortCategory(category);

            let company = $(element).find('td[id="RVettore"] img').attr('alt')?.toLowerCase().trim() || null;
            const getCompany = (company: string | null): string | null => {
                if (!company) return null;
                if (company === 'ente volturno autonomo') return 'EAV';
                if (company === 'sad - trasporto locale spa') return 'SAD';
                if (company.startsWith('obb')) return 'OBB';
                return company;
            };

            company = getCompany(company);

            let stops: TrainStop[] = [];
            const stopsText = $(element)
                .find('td[id="RDettagli"] div[class="FermateSuccessivePopupStyle"] div[class="testoinfoaggiuntive"]')
                .first()
                .text()
                .trim();

            stops = [...stopsText.matchAll(/(?:FERMA A:\s*)?([^()-]+)\s*\((\d{1,2}[:.]\d{2})\)/g)]
                .map(match => ({
                    location: match[1].trim().replace(/^- /, "").toLowerCase(),
                    time: match[2].replace(".", ":"),
                }));

            if (number && destination && departureTime) {
                trains.push({
                    company,
                    category,
                    shortCategory,
                    number,
                    destination,
                    departureTime,
                    delay,
                    platform,
                    departing,
                    stops,
                });
            }
        });

        return { trains, alerts };
    } catch (error: any) {
        console.error(`Error in getStationMonitor: ${error.message}`);
        return { trains: [], alerts: "", error: "Errore nel recupero dei dati" };
    }
}