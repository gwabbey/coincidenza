"use server";

import {trainCategoryShortNames} from "@/train-categories";
import {capitalize} from "@/utils";
import * as cheerio from 'cheerio';
import {StationMonitor, TrainDeparture} from "../types";
import {createAxiosClient} from "@/api/axios";

const axios = createAxiosClient();
const vtIdCache = new Map<string, string>();

export async function getVtId(name: string): Promise<string> {
    if (vtIdCache.has(name)) return vtIdCache.get(name)!;

    const res = await axios.get(`https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/autocompletaStazione/${name}`);
    const lines = res.data.trim().split("\n").filter(Boolean);

    if (lines.length === 0) return "";

    const parsed = lines.map((line: string) => {
        const [label, id] = line.split("|");
        return {label: label.trim(), id: id.trim()};
    });

    const [first, second] = parsed;

    if (second && first.label.toLowerCase() === second.label.toLowerCase()) {
        const now = new Date();
        const hour = now.getHours();

        if (hour >= 4 && hour <= 23) {
            const testRes = await axios.get(`https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${first.id}/0`)
                .catch(() => null);

            if (!testRes?.data || Array.isArray(testRes.data) && testRes.data.length === 0) {
                vtIdCache.set(name, second.id);
                return second.id;
            }
        }
    }

    vtIdCache.set(name, first.id);
    return first.id;
}

async function getVtDepartures(id: string) {
    const response = await axios.get(`https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${id}/${new Date().toString()}`);

    if (response.status === 200) {
        return response.data;
    }
    return null;
}

export async function getMonitor(rfiId: string, vtId: string = ""): Promise<StationMonitor | null> {
    try {
        const response = await axios.get(`https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${rfiId}&arrivals=False`);
        const $ = cheerio.load(response.data);

        const name = capitalize($('h1[id="nomeStazioneId"]').text().trim());
        const vtData = vtId !== "" ? await getVtDepartures(vtId) : [];

        const trains: TrainDeparture[] = [];
        const alertsText = $('#barraInfoStazioneId > div').find('div[class="marqueeinfosupp"] div').text().trim()
        const alerts = !["attraversare i binari", "aprire le porte", "la linea gialla"].some(str => alertsText.toLowerCase().includes(str)) ? alertsText : "";

        $('#bodyTabId > tr').each((_, element) => {
            const hasContent = $(element).find('td').toArray().some(td => $(td).text().trim());
            if (!hasContent) return;

            let category = $(element)
                .find('td[id="RCategoria"] img')
                .attr('alt')
                ?.replace('Categoria ', '')
                .replace('CIVITAVECCHIA EXPRESS ', '')
                .replace('TROPEA EXPRESS', 'Regionale')
                .toLowerCase()
                .trim() || null;
            if (category?.includes('regionale veloce')) {
                category = 'regionale veloce';
            }
            const number = $(element).find('td[id="RTreno"]').text().trim();
            const destination = $(element).find('td[id="RStazione"] div').text().toLowerCase().trim();
            const departureTime = $(element).find('td[id="ROrario"]').text().trim();

            let delay = $(element).find('td[id="RRitardo"]').text().trim() || '0';
            const platform = category === "autocorsa" || category === "bus" ? "Piazzale Esterno" : $(element).find('td[id="RBinario"] div').text().trim();
            const departing = $(element).find('td[id="RExLampeggio"] img').attr('alt')?.toLowerCase().trim() === "si";

            const vtTrain = vtData.find((vt: any) => vt.numeroTreno && vt.numeroTreno.toString() === number);

            if (vtTrain) {
                const rfiDelay = parseInt(delay.replace(/\D/g, '')) || 0;
                const vtDelay = vtTrain.ritardo || 0;

                if (vtDelay > rfiDelay && vtDelay > 0) {
                    delay = vtDelay.toString();
                }
            }

            const getShortCategory = (category: string | null): string | null => {
                if (!category) return null;
                if (category === "railjet") return "EC";
                if (category.includes('regionale veloce')) return "RV";
                if (category.startsWith('es')) return "AV";
                if (category.startsWith('suburbano')) return category.split(' ')[1];
                if (category.startsWith('servizio ferroviario metropolitano')) {
                    return category.replace('servizio ferroviario metropolitano linea', 'SFM');
                }
                return trainCategoryShortNames[category] || category.toUpperCase();
            };

            const shortCategory = getShortCategory(category);

            let company = $(element).find('td[id="RVettore"] img').attr('alt')?.toLowerCase()?.trim() || "";
            const getCompany = (company: string): string => {
                if (company.startsWith("regionale")) return "Trenitalia"
                if (company.startsWith('sad')) return 'SAD';
                if (company.startsWith('obb')) return 'ÖBB';
                if (company === 'tt') return 'Trentino Trasporti';
                if (company === 'ntv') return 'Italo';
                return capitalize(company);
            };

            company = getCompany(company);

            let stops;
            const infoElements = $(element)
                .find('td[id="RDettagli"] div.FermateSuccessivePopupStyle div.testoinfoaggiuntive');
            const stopsText = infoElements.eq(0).text().trim();

            stops = stopsText
                .replace(/^FERMA A:\s*/i, "")
                .split(" - ")
                .map(raw => {
                    const match = raw.match(/^([^()]+)\s*\((\d{1,2}[:.]\d{2})\)$/);
                    if (!match) return null;

                    return {
                        name: capitalize(match[1]
                            .trim()
                            .toLowerCase()
                            .replace(/'/g, "")
                            .replace(/-/g, " ")), time: match[2].replace(".", ":"),
                    };
                })
                .filter((x): x is { name: string; time: string } => x !== null);

            const alerts = infoElements.eq(1).length && !["RITARDO", "CODA", "TESTA", "CLASSE", "NO-STOP", "No Stop", "CON BUS SOSTITUTIVO DAL PIAZZALE ANTISTANTE LA STAZIONE", "SOPPRESSO"].some(word => infoElements.eq(1).text().trim().includes(word)) ? infoElements.eq(1).text().trim() : '';

            if (number && destination && departureTime) {
                trains.push({
                    company,
                    category,
                    shortCategory,
                    number,
                    destination: capitalize(destination),
                    departureTime,
                    delay,
                    platform,
                    departing,
                    stops,
                    alerts
                });
            }
        });

        return {name, trains, alerts};
    } catch (error) {
        return null;
    }
}