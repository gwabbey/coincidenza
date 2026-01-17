"use server";

import {createAxiosClient} from "@/api/axios";
import {capitalize} from "@/utils";

const axios = createAxiosClient();

function stringToIso(date: string) {
    return new Date(parseInt(date.match(/\d+/)![0], 10)).toISOString();
}

export async function getDepartures(agency: string, id: string, date: string) {
    const {
        data, status
    } = await axios.post("https://www.mycicero.it/OTPProxy/host.ashx?url=momoservice/json/GetArriviPartenzePalina2", {
        CodAzienda: agency,
        Giorno: `/Date(${new Date(date).getTime()}+0100)/`,
        CodFermata: id,
        IdSistema: "OTP_NE",
        MaxNumeroPassaggi: {
            NumeroRisultati: 5
        },
        MaxNumeroPassaggiLinee: {
            NumeroRisultati: 0
        },
        OraDa: `/Date(${new Date(date).getTime()}+0100)/`
    }, {
        headers: {
            'Client': 'tpwebportal;5.4.1'
        }
    });

    if (status !== 200) return null;

    const departures = data.Oggetto;
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
    const delay = trip.Ritardo ? parseInt(trip.Ritardo == "" ? 0 : trip.Ritardo) : null;
    const company = "atv";

    return {
        id,
        currentStopIndex,
        company,
        lastKnownLocation: trip.StazioneUltimoRilevamento ? capitalize(trip.StazioneUltimoRilevamento) : currentStopIndex >= 0 ? capitalize(trip.Fermate[currentStopIndex].Localita.Descrizione) : null,
        lastUpdate: currentStopIndex > -1 ? new Date(new Date(stringToIso(trip.Fermate[currentStopIndex].Orario)).getTime() + (delay || 0) * 60_000).toISOString() : null,
        status: "active",
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
            id: stop.Localita.Id,
            name: capitalize(stop.Localita.Descrizione),
            scheduledArrival: stringToIso(stop.Orario),
            scheduledDeparture: stringToIso(stop.OrarioPartenza),
            status: "regular",
            lat: stop.Localita.Coordinate.Lat?.toString() ?? "",
            lon: stop.Localita.Coordinate.Lon?.toString() ?? "",
        })),
        info: [],
    }
}