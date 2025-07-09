"use server";

import { trainCategoryShortNames } from "@/train-categories";
import { capitalize } from "@/utils";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { StationMonitor, Train } from "../types";

const vtIdCache = new Map<string, string>();

export async function getVtId(name: string): Promise<string> {
    if (vtIdCache.has(name)) return vtIdCache.get(name)!;

    const res = await axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/autocompletaStazione/${name}`);
    const lines = res.data.trim().split("\n").filter(Boolean);

    if (lines.length === 0) return "";

    const parsed = lines.map((line: string) => {
        const [label, id] = line.split("|");
        return { label: label.trim(), id: id.trim() };
    });

    const [first, second] = parsed;

    if (second && first.label.toLowerCase() === second.label.toLowerCase()) {
        const now = new Date();
        const hour = now.getHours();

        if (hour >= 4 && hour <= 23) {
            const testRes = await axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${first.id}/0`)
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
    const response = await axios.get(
        `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${id}/${new Date().toString()}`
    );

    if (response.status === 200) {
        const data = response.data;
        return data;
    }
    return null;
}

function parseTimeString(timeStr: string): Date {
    const now = new Date();
    const [hourStr, minuteStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const today = new Date(now);
    today.setHours(hour, minute, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const diffToday = Math.abs(today.getTime() - now.getTime());
    const diffTomorrow = Math.abs(tomorrow.getTime() - now.getTime());
    const diffYesterday = Math.abs(yesterday.getTime() - now.getTime());

    const closest = Math.min(diffToday, diffTomorrow, diffYesterday);

    if (closest === diffToday) return today;
    if (closest === diffTomorrow) return tomorrow;
    return yesterday;
}

export async function getMonitor(rfiId: string, vtId: string = ""): Promise<StationMonitor> {
    try {
        const client = axios.create();

        axiosRetry(client, {
            retries: 5,
            retryDelay: axiosRetry.exponentialDelay,
            onRetry: (retryCount, error) => {
                console.log(
                    `retry attempt ${retryCount} for error ${error.response?.statusText}`
                );
            },
        });

        const response = await client.get(
            `https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${rfiId}&arrivals=False`
        );
        const $ = cheerio.load(response.data);

        const name = capitalize($('h1[id="nomeStazioneId"]').text().trim());
        const vtData = vtId !== "" ? await getVtDepartures(vtId) : [];

        const trains: Train[] = [];
        const alerts = $('#barraInfoStazioneId > div')
            .find('div[class="marqueeinfosupp"] div')
            .text()
            .trim();

        $('#bodyTabId > tr').each((_, element) => {
            const hasContent = $(element).find('td').toArray().some(td => $(td).text().trim());
            if (!hasContent) return;

            const category = $(element)
                .find('td[id="RCategoria"] img')
                .attr('alt')
                ?.replace('Categoria ', '')
                .replace('CIVITAVECCHIA EXPRESS ', '')
                .toLowerCase()
                .trim() || null;
            const number = $(element).find('td[id="RTreno"]').text().trim();
            const destination = $(element).find('td[id="RStazione"] div').text().toLowerCase().trim();
            const departureTime = parseTimeString($(element).find('td[id="ROrario"]').text().trim());

            let delay = $(element).find('td[id="RRitardo"]').text().trim() || '0';
            const platform = category === "autocorsa"
                ? "Piazzale Esterno"
                : $(element).find('td[id="RBinario"] div').text().trim();
            const departing =
                $(element).find('td[id="RExLampeggio"] img').attr('alt')?.toLowerCase().trim() === "si";

            const vtTrain = vtData.find((vt: any) =>
                vt.numeroTreno && vt.numeroTreno.toString() === number
            );

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
                if (category.startsWith('suburbano')) return category.split(' ')[1];
                if (category.startsWith('servizio ferroviario metropolitano')) {
                    return category.replace('servizio ferroviario metropolitano linea', 'SFM');
                }
                return trainCategoryShortNames[category as keyof typeof trainCategoryShortNames];
            };

            const shortCategory = getShortCategory(category);

            let company = $(element).find('td[id="RVettore"] img').attr('alt')?.toLowerCase()?.trim() || "";
            const getCompany = (company: string): string => {
                if (company === 'ente volturno autonomo') return 'EAV';
                if (company === 'sad - trasporto locale spa') return 'SAD';
                if (company.startsWith('obb')) return 'ÖBB';
                return capitalize(company);
            };

            company = getCompany(company);

            let stops: any[] = [];
            const stopsText = $(element)
                .find('td[id="RDettagli"] div[class="FermateSuccessivePopupStyle"] div[class="testoinfoaggiuntive"]')
                .first()
                .text()
                .trim();

            stops = stopsText
                .replace(/^FERMA A:\s*/i, "")
                .split(" - ")
                .map(raw => {
                    const match = raw.match(/^([^()]+)\s*\((\d{1,2}[:.]\d{2})\)$/);
                    if (!match) return null;

                    return {
                        name: capitalize(
                            match[1]
                                .trim()
                                .toLowerCase()
                                .replace(/'/g, "")
                                .replace(/-/g, " ")
                        ),
                        time: match[2].replace(".", ":"),
                    };
                })
                .filter(Boolean);

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
                    stops
                });
            }
        });

        return { name, trains, alerts };
    } catch (error) {
        return { name: "", trains: [], alerts: "" };
    }
}