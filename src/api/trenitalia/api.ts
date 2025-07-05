import { capitalize } from "@/utils";
import axios from 'axios';
import { parseStringPromise } from "xml2js";
import { Trip } from "../types";

export async function getRfiAlerts(regions?: string[]) {
    const { data } = await axios.get("https://www.rfi.it/content/rfi/it/news-e-media/infomobilita.rss.updates.xml",
        { responseType: "text" }
    )

    const parsed = await parseStringPromise(data, {
        explicitArray: false,
        mergeAttrs: true,
    })

    const items = parsed.rss.channel.item
    const alerts = Array.isArray(items) ? items : [items]

    const now = new Date();
    const midnight = new Date().setHours(0, 0, 0, 0);

    const cutoff = new Date(midnight);
    if (now.getHours() < 1) {
        cutoff.setHours(cutoff.getHours() - 1);
    }

    return alerts
        .map(item => {
            const regionList = item["rfi:region"].split(",").map((r: string) => r.trim())

            return {
                title: item.title,
                link: item.link,
                pubDate: new Date(item.pubDate),
                regions: regionList,
            }
        })
        .filter(
            (alert) =>
                (!regions?.length || alert.regions.some((r: string) => regions.includes(r))) && alert.pubDate >= cutoff
        )
}

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

function normalizeStationName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\bc\.? ?le\b/g, "centrale")
        .replace("posto comunicazione", "pc")
        .replace("`", "'")
        .replace(/\s*-\s*/g, "-")
        .replace(/\s+/g, ' ')
        .trim();
}

function getTripStatus(trip: any) {
    if (trip.provvedimento === 1) return "canceled";
    if (trip.nonPartito && !trip.oraUltimoRilevamento) return "scheduled";
    if (trip.arrivato) return "completed";
    return "active";
}

function getStopStatus(stop: any) {
    if (stop.fermata.actualFermataType === 2) return "not_planned";
    if (stop.fermata.actualFermataType === 3) return "canceled";
    return "regular";
}

function getCategory(trip: any) {
    if (trip.categoria === "REG") return "R";
    if (!trip.categoria) return trip.compNumeroTreno.trim().split(" ")[0];
    return trip.categoria;
}

export async function getTrip(id: string): Promise<Trip | null> {
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

    const tripDetailsPromises = parsed.map(async (trip: any) => {
        const { code, origin, timestamp } = trip;

        return axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${origin}/${code}/${timestamp}`)
            .then(response => response.status !== 204 ? { trip, data: response.data } : null)
            .catch(() => null);
    });

    const tripDetails = (await Promise.all(tripDetailsPromises)).filter(Boolean);

    const selectedTrip = tripDetails.find(({ data }) => !data.arrivato && !data.nonPartito)?.trip || parsed[0];
    if (!selectedTrip) return null;

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

    const response = await axios.get(
        `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${origin}/${code}/${timestamp}`
    );

    if (response.status === 200) {
        const trip = response.data;
        const info = await getTripSmartCaring(code, origin, formattedDate);
        const canvas = await getTripCanvas(code, origin, timestamp);
        const currentStopIndex = canvas.findIndex((item: any) => item.stazioneCorrente) || -1;
        const currentStopName = canvas.find((item: any) => item.stazioneCorrente)?.stazione;

        return {
            currentStopIndex,
            lastKnownLocation: capitalize(normalizeStationName(currentStopName === trip.stazioneUltimoRilevamento ? currentStopName : trip.stazioneUltimoRilevamento || "--")),
            lastUpdate: trip.oraUltimoRilevamento ? new Date(trip.oraUltimoRilevamento) : null,
            status: getTripStatus(trip),
            category: getCategory(trip),
            number: trip.numeroTreno,
            origin: capitalize(normalizeStationName(trip.origineEstera || trip.origine)),
            destination: capitalize(normalizeStationName(trip.destinazioneEstera || trip.destinazione)),
            departureTime: new Date(trip.orarioPartenzaEstera || trip.orarioPartenza),
            arrivalTime: new Date(trip.orarioArrivoEstera || trip.orarioArrivo),
            delay: trip.ritardo,
            alertMessage: trip.subTitle,
            stops: canvas.map((stop: any) => {
                const scheduledArrival = stop.fermata.arrivo_teorico ? new Date(stop.fermata.arrivo_teorico) : null;
                const scheduledDeparture = stop.fermata.partenza_teorica ? new Date(stop.fermata.partenza_teorica) : null;

                const actualArrival = stop.fermata.arrivoReale ? new Date(stop.fermata.arrivoReale) : null;
                const actualDeparture = stop.fermata.partenzaReale ? new Date(stop.fermata.partenzaReale) : null;

                return {
                    id: stop.id,
                    name: capitalize(normalizeStationName(stop.stazione)),
                    scheduledArrival,
                    scheduledDeparture,
                    actualArrival,
                    actualDeparture,
                    arrivalDelay: stop.fermata.ritardoArrivo,
                    departureDelay: stop.fermata.ritardoPartenza,
                    scheduledPlatform: stop.fermata.binarioProgrammatoPartenzaDescrizione || stop.fermata.binarioProgrammatoArrivoDescrizione,
                    actualPlatform: stop.fermata.binarioEffettivoPartenzaDescrizione || stop.fermata.binarioEffettivoArrivoDescrizione,
                    status: getStopStatus(stop),
                };
            }),
            info: info ? info.map((alert: any) => ({
                id: alert.id,
                message: alert.infoNote,
                date: new Date(alert.insertTimestamp)
            })).filter((alert: any, i: number, self: any[]) =>
                self.findIndex(a => a.message === alert.message) === i
            ) : []
        };
    } else {
        return null;
    }
}
