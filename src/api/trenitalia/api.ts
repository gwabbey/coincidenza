import { capitalize, findMatchingStation } from "@/utils";
import axios from 'axios';
import { parseStringPromise } from "xml2js";
import { Trip } from "../types";
import { getMonitor } from "./monitor";

interface RfiItem {
    title: string;
    link: string;
    pubDate: Date;
    regions: string[];
}

const timestampToIso = (timestamp: number | null) => timestamp ? new Date(timestamp).toISOString() : null;

async function getRfiData(url: string, regions?: string[], dateFilter?: (date: Date) => boolean): Promise<RfiItem[]> {
    const { data } = await axios.get(url, { responseType: "text" });
    const parsed = await parseStringPromise(data, {
        explicitArray: false,
        mergeAttrs: true,
    });

    if (!parsed) return [];

    const items = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];

    return items
        .map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: timestampToIso(item.pubDate),
            regions: item["rfi:region"]?.split(",").map((r: string) => r.trim()),
        }))
        .filter((item: any) =>
            (!regions?.length || item.regions?.some((r: string) => regions.includes(r))) &&
            (!dateFilter || dateFilter(item.pubDate))
        );
}

export async function getRfiAlerts(regions?: string[]): Promise<RfiItem[]> {
    const now = new Date();
    const cutoff = new Date().setHours(now.getHours() < 1 ? -1 : 0, 0, 0, 0);

    return getRfiData(
        "https://www.rfi.it/content/rfi/it/news-e-media/infomobilita.rss.updates.xml",
        regions,
        date => date >= new Date(cutoff)
    );
}

export async function getRfiNotices(regions?: string[]): Promise<RfiItem[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return getRfiData(
        "https://www.rfi.it/content/rfi/it/news-e-media/infomobilita.rss.notices.xml",
        regions,
        date => date >= startOfToday
    );
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

function normalizeToMinute(date: Date): Date {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d;
}

function getTripStatus(trip: any, canvas: any) {
    if (trip.provvedimento === 1) return "canceled";
    if (trip.nonPartito && !trip.oraUltimoRilevamento && !canvas[0].fermata.partenzaReale) return "scheduled";
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
    if (!trip.categoria) {
        const fullTrainId = trip.compNumeroTreno.trim().split(" ")
        if (fullTrainId.length < 2) return "Treno"
        return fullTrainId[0]
    }
    return trip.categoria;
}

export async function getMonitorTrip(rfiId: string, tripId: string) {
    const monitor = await getMonitor(rfiId);
    const train = monitor.trains.find(train => String(train.number) === String(tripId));
    if (!train) return null;
    return train;
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
        .format(new Date(selectedTrip.timestamp))
        .split("/")
        .reverse()
        .join("-");

    const [response, info, canvas] = await Promise.all([
        axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${origin}/${code}/${timestamp}`),
        getTripSmartCaring(code, origin, formattedDate),
        getTripCanvas(code, origin, timestamp)
    ]);

    if (response.status === 200) {
        if (response.status !== 200) return null;

        const trip = response.data;
        const now = new Date();

        const currentStopIndex = canvas.findIndex((item: any) => item.stazioneCorrente) ?? -1;
        const currentStop = canvas[currentStopIndex];
        const nextStop = canvas[currentStopIndex + 1];

        const hasArrived = currentStop?.fermata?.arrivoReale !== null;
        const hasNotDeparted = !currentStop?.fermata?.partenzaReale;
        const isAtCurrentStop = (hasArrived && hasNotDeparted) || currentStop.fermata.progressivo === 1 && trip.nonPartito;

        const isDepartingThisMinute = currentStop?.fermata?.partenzaReale &&
            normalizeToMinute(new Date(currentStop.fermata.partenzaReale)).getTime() ===
            normalizeToMinute(now).getTime();

        let delay = isAtCurrentStop ? currentStop?.fermata?.ritardoPartenza : currentStop?.fermata?.ritardoArrivo || trip.ritardo;

        if (trip.nonPartito) {
            const rfiId = findMatchingStation(capitalize(canvas[0].stazione));
            if (rfiId) {
                const monitor = await getMonitorTrip(rfiId, trip.numeroTreno);
                if (monitor) delay = Number(monitor.delay);
            }
        } else {
            const targetStop = !nextStop.fermata.arrivoReale ? nextStop : currentStop;
            const scheduledRaw = nextStop
                ? targetStop.fermata.arrivo_teorico
                : targetStop.fermata.partenza_teorica;

            const actualDelay = isDepartingThisMinute
                ? currentStop.fermata.ritardoPartenza
                : trip.ritardo;

            delay = actualDelay;

            if (scheduledRaw) {
                const scheduled = new Date(scheduledRaw);
                const delayed = new Date(scheduled.getTime() + actualDelay * 60000);
                const lateBy = now.getTime() - delayed.getTime();

                if (lateBy > 2 * 60 * 1000) {
                    console.log(lateBy)
                    const rfiId = findMatchingStation(capitalize(targetStop.stazione));
                    if (rfiId) {
                        const monitor = await getMonitorTrip(rfiId, trip.numeroTreno);
                        const monitorDelay = Number(monitor?.delay);
                        if (!isNaN(monitorDelay) && monitorDelay > actualDelay) {
                            delay = monitorDelay;
                        }
                    }
                }
            }
        }

        return {
            currentStopIndex,
            delay,
            lastKnownLocation: (isAtCurrentStop || isDepartingThisMinute)
                ? capitalize(normalizeStationName(currentStop.stazione))
                : capitalize(trip.stazioneUltimoRilevamento || "--"),
            lastUpdate: currentStop.fermata.partenzaReale && !trip.oraUltimoRilevamento
                ? timestampToIso(currentStop.fermata.partenzaReale)
                : trip.oraUltimoRilevamento
                    ? timestampToIso(trip.oraUltimoRilevamento)
                    : null,
            status: getTripStatus(trip, canvas),
            category: getCategory(trip),
            number: trip.numeroTreno,
            origin: capitalize(normalizeStationName(trip.origineEstera || trip.origine)),
            destination: capitalize(normalizeStationName(trip.destinazioneEstera || trip.destinazione)),
            departureTime: timestampToIso(trip.oraPartenzaEstera || trip.orarioPartenza)!,
            arrivalTime: timestampToIso(trip.oraArrivoEstera || trip.orarioArrivo)!,
            alertMessage: trip.subTitle,
            stops: canvas.map((stop: any) => {

                return {
                    id: stop.id,
                    name: capitalize(normalizeStationName(stop.stazione)),
                    scheduledArrival: timestampToIso(stop.fermata.arrivo_teorico),
                    scheduledDeparture: timestampToIso(stop.fermata.partenza_teorica),
                    actualArrival: timestampToIso(stop.fermata.arrivoReale),
                    actualDeparture: timestampToIso(stop.fermata.partenzaReale),
                    arrivalDelay: stop.fermata.ritardoArrivo,
                    departureDelay: stop.fermata.ritardoPartenza,
                    scheduledPlatform: stop.fermata.binarioProgrammatoPartenzaDescrizione || stop.fermata.binarioProgrammatoArrivoDescrizione,
                    actualPlatform: stop.fermata.binarioEffettivoPartenzaDescrizione || stop.fermata.binarioEffettivoArrivoDescrizione,
                    status: getStopStatus(stop),
                };
            }),
            info: info
                ? info
                    .map((alert: any) => ({
                        id: alert.id,
                        message: alert.infoNote,
                        date: timestampToIso(alert.insertTimestamp)
                    }))
                    .filter((alert: any, i: number, self: any[]) =>
                        self.findIndex(a => a.message === alert.message) === i
                    )
                : []
        };
    } else {
        return null;
    }
}
