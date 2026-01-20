"use server";

import {createAxiosClient} from "@/api/axios";
import {capitalize} from "@/utils";
import {BusDeparture} from "@/api/types";

const axios = createAxiosClient();

function stringToIso(date: string) {
    return new Date(parseInt(date.match(/\d+/)![0], 10)).toISOString();
}

export async function getStopDepartures(agency: string, id: string) {
    const now = Date.now();
    const earlier = now - 30 * 60000;

    const {
        data,
        status
    } = await axios.post("https://www.mycicero.it/OTPProxy/host.ashx?url=momoservice/json/GetArriviPartenzePalina2", {
        CodAzienda: agency === "atv" ? "ATV" : agency,
        Giorno: `/Date(${earlier}+0100)/`,
        CodFermata: id,
        IdSistema: "OTP_NE",
        MaxNumeroPassaggi: {NumeroRisultati: 10},
        MaxNumeroPassaggiLinee: {NumeroRisultati: 0},
        OraDa: `/Date(${earlier}+0100)/`
    }, {
        headers: {'Client': 'tpwebportal;5.4.1'}
    });

    if (status !== 200) return null;

    const departures = data.Oggetto.Passaggi ?? [];

    return departures
        .filter((trip: any) => trip.CapolineaArrivo.Codice !== id)
        .filter((trip: any) => {
            const scheduled = new Date(stringToIso(trip.DataOraPartenza)).getTime();
            const departureTime = scheduled + (trip.MinutiScostamento * 60000);
            if (departureTime >= now) return true;
            return !!trip.isPassaggioRealTime;
        })
        .map((trip: any) => {
            const scheduled = new Date(stringToIso(trip.DataOraPartenza)).getTime();
            const departureTime = scheduled + (trip.MinutiScostamento * 60000);

            return {
                id: trip.Corsa.Codice,
                route: trip.Percorso.Codice ?? "Bus",
                color: trip.Percorso.Linea.Colore ?? (!trip.Percorso.Linea.Extraurbano ? "1AC964" : "2D7FFF"),
                company: agency,
                destination: capitalize(trip.Percorso.DestinazioneUtenza),
                departureTime,
                delay: !trip.MinutiScostamento && trip.isPassaggioRealTime ? 0 : trip.MinutiScostamento,
                stopsAway: 0,
                tracked: trip.isPassaggioRealTime,
                departing: departureTime - now <= 60000,
            };
        });
}

export async function getDepartures(stops: Array<{
    id: string, name: string, distance: number, type: string
}>): Promise<BusDeparture[]> {
    const departures = stops.map(async (stop) => {
        try {
            const departures = await getStopDepartures("atv", stop.id.split(":")[stop.id.split(":").length - 1]);
            if (!departures) return [];

            return departures;
        } catch (error) {
            console.error(`Error fetching ATV departures for stop ${stop.id}:`, error);
            return [];
        }
    });

    return (await Promise.all(departures)).flat();
}

export async function getTrip(agency: string, id: string, date: string) {
    const {
        data, status
    } = await axios.post("https://www.mycicero.it/OTPProxy/host.ashx?url=momoservice/json/GetFermateCorsa2", {
        CodiceAzienda: agency,
        Giorno: `/Date(${new Date(date).getTime()}+0100)/`,
        IdCorsa: `${agency}#1:${id}`,
        IdSistema: "OTP_NE"
    }, {
        headers: {
            'Client': 'tpwebportal;5.4.1'
        }
    });

    if (status !== 200) return null;

    const trip = data.Oggetto;
    const currentStopIndex = trip.Fermate?.findIndex((f: any) => f.FermataCorrente) ?? -1;
    const delay = trip.Ritardo != null ? (trip.Ritardo == "" ? 0 : parseInt(trip.Ritardo)) : null;
    const company = agency == "ATV" ? "atv" : agency;

    return {
        id,
        currentStopIndex,
        company,
        lastKnownLocation: trip.StazioneUltimoRilevamento ? capitalize(trip.StazioneUltimoRilevamento) : currentStopIndex >= 0 ? capitalize(trip.Fermate[currentStopIndex].Localita.Descrizione) : null,
        lastUpdate: currentStopIndex > -1 ? new Date(new Date(stringToIso(trip.Fermate[currentStopIndex].Orario)).getTime() + (delay || 0) * 60_000).toISOString() : delay != null ? new Date().toISOString() : null,
        status: delay ? "active" : "scheduled",
        category: trip.Linea.Extraurbano ? "E" : "U",
        vehicleId: null,
        color: trip.Linea.Colore ?? "2C7FFF",
        route: trip.Linea.CodiceInfoUtenza,
        origin: capitalize(trip.Fermate[0].Localita.Descrizione),
        destination: capitalize(trip.Fermate[trip.Fermate.length - 1].Localita.Descrizione),
        departureTime: stringToIso(trip.Corsa.DataOraPartenza),
        arrivalTime: stringToIso(trip.Fermate[trip.Fermate.length - 1].Orario),
        delay,
        stops: trip.Fermate.map((stop: any) => ({
            id: `atv_${stop.Localita.Codice}`,
            name: capitalize(stop.Localita.Descrizione),
            scheduledArrival: stringToIso(stop.OrarioProgrammato),
            scheduledDeparture: stringToIso(stop.OrarioPartenzaProgrammato),
            status: "regular",
            lat: stop.Localita.Coordinate.Lat?.toString() ?? "",
            lon: stop.Localita.Coordinate.Lon?.toString() ?? "",
        })),
        info: [],
    }
}