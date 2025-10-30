import {capitalize, clients, findMatchingStation, getDistance} from "@/utils";
import axios from 'axios';
import {parseStringPromise} from "xml2js";
import {Trip} from "../types";
import {getMonitor} from "./monitor";
import stationLocations from "@/station-locations.json";
import stations from "@/stations.json";

interface RfiItem {
    title: string;
    link: string;
    pubDate: Date;
    regions: string[];
}

const timestampToIso = (timestamp: number | null) => timestamp ? new Date(timestamp).toISOString() : null;

async function getRfiData(url: string, regions?: string[], dateFilter?: (date: Date) => boolean): Promise<RfiItem[]> {
    const {data} = await axios.get(url, {responseType: "text"});
    const parsed = await parseStringPromise(data, {
        explicitArray: false, mergeAttrs: true,
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
        .filter((item: any) => (!regions?.length || item.regions?.some((r: string) => regions.includes(r))) && (!dateFilter || dateFilter(item.pubDate)));
}

export async function getRfiAlerts(regions?: string[]): Promise<RfiItem[]> {
    return getRfiData("https://www.rfi.it/content/rfi/it/news-e-media/infomobilita.rss.updates.xml", regions, date => {
        const pub = new Date(date);
        return pub.toDateString() === new Date().toDateString();
    });
}

export async function getRfiNotices(regions?: string[]): Promise<RfiItem[]> {
    return getRfiData("https://www.rfi.it/content/rfi/it/news-e-media/infomobilita.rss.notices.xml", regions);
}

export async function getTripSmartCaring(code: string, origin: string, date: string) {
    const {data} = await axios.get(
        `https://www.viaggiatreno.it/infomobilita/resteasy/news/smartcaring?commercialTrainNumber=${code}&originCode=${origin}&searchDate=${date}`
    );

    if (!Array.isArray(data) || data.length === 0) return [];

    const filtered = data.filter(
        (item: any) => {
            const info = item.infoNote?.toLowerCase() ?? "";
            const date = new Date(item.endValidity)
            date.setHours(23, 59, 59)
            const validUntil = date.getTime();

            return (
                !["good morning", "good afternoon", "good evening", "guten morgen"].some((phrase) => info.includes(phrase)) &&
                !isNaN(validUntil) && validUntil > Date.now()
            );
        }
    );

    return filtered.length > 0 ? filtered : [];
}

export async function getTripCanvas(code: string, origin: string, timestamp: number) {
    const {data} = await axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/tratteCanvas/${origin}/${code}/${timestamp}`);
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
    if (!monitor) return null;
    const train = monitor.trains.find(train => String(train.number) === String(tripId));
    if (!train) return null;
    return train;
}

async function getTripsById(id: string) {
    if (!id) return null;

    const {data, status} = await axios.get<string>(
        `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete/${id}`
    );

    if (!data?.trim() || status !== 200) return null;

    const parsed = data
        .trim()
        .split("\n")
        .map((line) => {
            const [left, right] = line.split("|");
            if (!left || !right) return null;

            const [code] = left.split(" - ");
            const rightParts = right.split("-");
            if (rightParts.length < 2) return null;

            const [origin, timestampStr] = rightParts.slice(-2);
            const timestamp = Number(timestampStr);
            if (isNaN(timestamp)) return null;

            return {code: code.trim(), origin: origin.trim(), timestamp};
        })
        .filter(
            (t): t is { code: string; origin: string; timestamp: number } =>
                t !== null
        );

    return parsed.length === 0 ? null : parsed;
}

export async function getActualTrip(id: string, company: string) {
    const parsed = await getTripsById(id);
    if (!parsed) return null;

    const results = await Promise.allSettled(
        parsed.map((t) =>
            axios
                .get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${t.origin}/${t.code}/${t.timestamp}`)
                .then((res) => ({
                    trip: t,
                    andamento: res.data,
                }))
        )
    );

    const valid = results
        .filter((r): r is PromiseFulfilledResult<{ trip: any; andamento: any }> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((r) => {
            const codiceCliente = r.andamento?.codiceCliente as number | undefined;
            return codiceCliente !== undefined && clients[codiceCliente] === company;
        });

    if (valid.length === 0) return null;

    const running = valid.find(
        (r) => !r.andamento.arrivato
    );

    const chosen = running ?? valid[0];

    return {
        origin: chosen.trip.origin,
        id: chosen.trip.code,
        timestamp: chosen.trip.timestamp,
    };
}

export async function guessTrip(id: string, date: Date) {
    const parsed = await getTripsById(id);
    if (!parsed) return null;

    const midnightTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    return getTrip(parsed[0].origin, id, midnightTimestamp);
}

export async function getTrip(origin: string, id: string, timestamp: number): Promise<Trip | null> {
    const formattedDate = new Intl.DateTimeFormat("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
        .format(new Date(timestamp))
        .split("/")
        .reverse()
        .join("-");

    const [response, info, canvas] = await Promise.all([
        axios.get(`http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${origin}/${id}/${timestamp}`),
        getTripSmartCaring(id, origin, formattedDate),
        getTripCanvas(id, origin, timestamp),
    ]);

    if (response.status !== 200) return null;

    const now = new Date().getTime();
    let currentStopIndex = canvas.findIndex((item: any) => item.stazioneCorrente);

    if (currentStopIndex === -1 || canvas[currentStopIndex]?.fermata?.actualFermataType === 3) {
        currentStopIndex = canvas.findIndex((item: any) => item.fermata?.actualFermataType !== 3);
    }

    const currentStop = currentStopIndex >= 0 ? canvas[currentStopIndex] : null;
    const nextStop = currentStopIndex >= 0 ? canvas[currentStopIndex + 1] : null;
    const trip = response.data;

    let delay = trip.ritardo || currentStop.fermata?.ritardoPartenza || currentStop.fermata?.ritardoArrivo;
    let lastKnownLocation = capitalize(trip.stazioneUltimoRilevamento || "--");

    if (currentStop?.fermata) {
        const isStationed = currentStop?.fermata.arrivoReale && !currentStop?.fermata.partenzaReale;

        if (isStationed) delay = currentStop?.fermata.ritardoArrivo

        const scheduled = new Date(currentStop.fermata.partenzaReale);
        const delta = scheduled.getTime() - now;
        const isDepartingNow = currentStop.fermata.partenzaReale && currentStop.fermata.arrivoReale && Math.abs(delta) <= 60000;

        if (isDepartingNow && delay !== currentStop?.fermata.ritardoPartenza) {
            delay = currentStop?.fermata.ritardoPartenza;
        }
    }

    if (trip.nonPartito && !currentStop.fermata.partenzaReale) delay = null;

    const getMonitorDelay = async (stop: any, trainNumber: string, tripDelay: number) => {
        const stationName = stop?.stazione;
        if (!stationName) return null;

        const rfiId = findMatchingStation(capitalize(stationName));
        if (!rfiId) return null;

        const monitor = await getMonitorTrip(rfiId, trainNumber);
        if (monitor && !isNaN(Number(monitor.delay)) && Number(monitor.delay) > tripDelay && Number(monitor.delay) > 0) {
            return Number(monitor.delay);
        }
        return null;
    };

    const isLateForDeparture = currentStop?.fermata && !currentStop?.fermata.partenzaReale && (currentStop?.fermata.partenza_teorica + trip.ritardo * 60000 < now);
    const isLateForArrival = !isLateForDeparture && nextStop?.fermata && !nextStop?.fermata.arrivoReale && (nextStop?.fermata.arrivo_teorico + trip.ritardo * 60000 < now);

    let rfiDelay = null;

    if (trip.nonPartito || isLateForDeparture) {
        rfiDelay = await getMonitorDelay(currentStop, trip.numeroTreno, trip.ritardo);
    } else if (isLateForArrival) {
        rfiDelay = await getMonitorDelay(nextStop, trip.numeroTreno, trip.ritardo);
    }

    if (rfiDelay !== null) {
        delay = rfiDelay;
    }

    if (currentStop?.fermata) {
        const arrival = currentStop.fermata.arrivoReale ? new Date(currentStop.fermata.arrivoReale).getTime() : null;
        const departure = currentStop.fermata.partenzaReale ? new Date(currentStop.fermata.partenzaReale).getTime() : null;
        const now = Date.now();
        const closeToStation = (arrival && !departure && now - arrival < 60 * 1000) || (departure && now - departure < 60 * 1000);
        if (closeToStation) {
            lastKnownLocation = capitalize(currentStop.stazione);
        }
    }

    return {
        currentStopIndex,
        delay,
        lastKnownLocation,
        lastUpdate: currentStop?.fermata?.partenzaReale > trip.oraUltimoRilevamento ? timestampToIso(currentStop.fermata.partenzaReale) : currentStop?.fermata?.arrivoReale > trip.oraUltimoRilevamento ? timestampToIso(currentStop.fermata.arrivoReale) : trip.oraUltimoRilevamento ? timestampToIso(trip.oraUltimoRilevamento) : null,
        status: getTripStatus(trip, canvas),
        category: getCategory(trip),
        number: trip.numeroTreno,
        origin: capitalize(normalizeStationName(trip.origineEstera || trip.origine)),
        destination: capitalize(normalizeStationName(trip.destinazioneEstera || trip.destinazione)),
        departureTime: timestampToIso(trip.oraPartenzaEstera || trip.orarioPartenza)!,
        arrivalTime: timestampToIso(trip.oraArrivoEstera || trip.orarioArrivo)!,
        alertMessage: trip.subTitle,
        clientId: trip.codiceCliente || 0,
        company: clients[trip.codiceCliente],
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
                .map((alert) => ({
                    message: alert.infoNote ?? "",
                    date: timestampToIso(alert.insertTimestamp) ?? "",
                    source: "Viaggiatreno",
                    url: null
                }))
                .filter(
                    (alert, i: number, self) =>
                        self.findIndex((a) => a.message === alert.message) === i
                )
            : []
    }
}

export function getNearestStation(userLat: number, userLon: number): { rfiId: string, vtId: string } {
    let nearest = stationLocations[0];
    let minDistance = getDistance(userLat, userLon, nearest.lat, nearest.lon);

    for (const station of stationLocations) {
        const distance = getDistance(userLat, userLon, station.lat, station.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = station;
        }
    }

    const nomeLungo = nearest.localita?.nomeLungo;
    const nomeBreve = nearest.localita?.nomeBreve;

    if (!nomeLungo && !nomeBreve) {
        return {
            rfiId: "", vtId: "",
        }
    }

    for (const [id, stationName] of Object.entries(stations)) {
        const normalizedStationName = normalizeStationName(stationName);
        const normalizedNomeLungo = nomeLungo ? normalizeStationName(nomeLungo) : '';
        const normalizedNomeBreve = nomeBreve ? normalizeStationName(nomeBreve) : '';

        if (normalizedStationName === normalizedNomeLungo || normalizedStationName === normalizedNomeBreve || normalizedStationName.includes(normalizedNomeLungo) || normalizedStationName.includes(normalizedNomeBreve) || normalizedNomeLungo.includes(normalizedStationName) || normalizedNomeBreve.includes(normalizedStationName)) {
            return {
                rfiId: id, vtId: nearest.codiceStazione
            }
        }
    }

    return {
        rfiId: "", vtId: "",
    }
}
