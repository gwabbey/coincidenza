"use server";

import { trainCategoryShortNames } from "@/train-categories";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { StationMonitor, Train, TrainStop, Trip } from "./types";

async function getRfiMonitor(id: string) {
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
}

async function getTrenordMonitor(id: string): Promise<StationMonitor> {
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
        `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${id}/${new Date().toString()}`
    );

    console.log(new Date().toString())
    const trains: Train[] = [];
    const alerts = "";

    response.data.forEach((trip: Trip) => {
        const shortCategory = "";
        const number = trip.numeroTreno.toString();
        const destination = trip.destinazioneEstera || trip.destinazione;
        const departureTime = trip.compOrarioPartenza;
        const delay = "";
        const departing = false;
        const company = "Trenord";

        if (number && destination && departureTime && !trip.arrivato) {
            trains.push({
                company,
                shortCategory,
                number,
                destination,
                departureTime,
                delay,
                platform: "",
                departing,
                stops: [],
                category: ""
            });
        }
    });

    return { trains, alerts };
}

export async function getMonitor(id: string): Promise<StationMonitor> {
    try {
        if (id.startsWith("N")) return await getTrenordMonitor(id);
        return await getRfiMonitor(id);
    } catch (error: any) {
        console.error(error.message);
        return { trains: [], alerts: "", error: "Errore nel recupero dei dati" };
    }
}