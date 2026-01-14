"use server"

import {createAxiosClient} from "@/api/axios";
import {TrainStop, TrainTrip} from "@/api/types";
import stations from "@/italo.json";
import {capitalize} from "@/utils";
import {differenceInMinutes} from "date-fns";

const axios = createAxiosClient();

export async function getTrip(id: string): Promise<TrainTrip | null> {
    const {
        data, status
    } = await axios.get(`https://italoinviaggio.italotreno.com/api/RicercaTrenoService/?TrainNumber=${id}`);

    if (status !== 200 || data.IsEmpty) return null;

    const train = data.TrainSchedule;
    const globalDelay = train.Distruption?.DelayAmount ?? 0;

    const timeToISO = (timeStr: string, baseDate: Date, previousTime?: Date): string | null => {
        if (!timeStr || timeStr === "01:00") return null;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);

        if (previousTime && date < previousTime) {
            date.setDate(date.getDate() + 1);
        }

        return date.toISOString();
    };

    const baseDate = new Date();
    const lastUpdate = timeToISO(data.LastUpdate, baseDate);
    let lastDepartureTime: Date | undefined;

    const pastStops = (train.StazioniFerme ?? []).map((st: any) => {
        const scheduledArrival = timeToISO(st.EstimatedArrivalTime, baseDate, lastDepartureTime);
        const scheduledDeparture = timeToISO(st.EstimatedDepartureTime, baseDate, scheduledArrival ? new Date(scheduledArrival) : lastDepartureTime);
        const actualArrival = timeToISO(st.ActualArrivalTime, baseDate, lastDepartureTime);

        let actualDeparture = timeToISO(st.ActualDepartureTime, baseDate, actualArrival ? new Date(actualArrival) : lastDepartureTime);

        if (actualArrival && scheduledDeparture && lastUpdate) {
            const lastUpdateTime = new Date(lastUpdate);
            const scheduledDepartureTime = new Date(scheduledDeparture);

            if (lastUpdateTime < scheduledDepartureTime) {
                actualDeparture = null;
            }
        }

        if (actualDeparture) {
            lastDepartureTime = new Date(actualDeparture);
        } else if (scheduledDeparture) {
            lastDepartureTime = new Date(scheduledDeparture);
        }

        return {
            id: st.RfiLocationCode,
            name: capitalize(st.LocationDescription),
            scheduledArrival,
            scheduledDeparture,
            actualArrival,
            actualDeparture,
            arrivalDelay: actualArrival && scheduledArrival ? differenceInMinutes(new Date(actualArrival), new Date(scheduledArrival)) : 0,
            departureDelay: actualDeparture && scheduledDeparture ? differenceInMinutes(new Date(actualDeparture), new Date(scheduledDeparture)) : (scheduledDeparture ? globalDelay : 0),
            scheduledPlatform: null,
            actualPlatform: st.ActualArrivalPlatform ?? null,
            status: "regular" as const,
        };
    });

    const nextStops = (train.StazioniNonFerme ?? []).map((st: any) => {
        const scheduledArrival = timeToISO(st.EstimatedArrivalTime, baseDate, lastDepartureTime);
        const scheduledDeparture = timeToISO(st.EstimatedDepartureTime, baseDate, scheduledArrival ? new Date(scheduledArrival) : lastDepartureTime);

        if (scheduledDeparture) lastDepartureTime = new Date(scheduledDeparture);

        return {
            id: st.RfiLocationCode,
            name: capitalize(st.LocationDescription),
            scheduledArrival,
            scheduledDeparture,
            actualArrival: null,
            actualDeparture: null,
            arrivalDelay: globalDelay,
            departureDelay: globalDelay,
            scheduledPlatform: null,
            actualPlatform: st.ActualArrivalPlatform ?? null,
            status: "regular" as const,
        };
    });

    const originDeparture = timeToISO(train.DepartureDate, baseDate);
    const originActualDeparture = timeToISO(train.StazionePartenza?.ActualDepartureTime, baseDate);

    const originStop: TrainStop = {
        id: train.StazionePartenza.RfiLocationCode,
        name: capitalize(train.DepartureStationDescription),
        scheduledArrival: null,
        scheduledDeparture: originDeparture,
        actualArrival: null,
        actualDeparture: originActualDeparture,
        arrivalDelay: null,
        departureDelay: differenceInMinutes(new Date(originActualDeparture || originDeparture || 0), new Date(originDeparture || 0)),
        scheduledPlatform: null,
        actualPlatform: train.StazionePartenza?.ActualArrivalPlatform ?? null,
        status: "regular" as const,
    };

    const stops: TrainStop[] = [originStop, ...pastStops, ...nextStops];

    let currentStopIndex = stops.findIndex(s => s.id === train.Leg?.ArrivalStation) - 1;
    if (currentStopIndex === -1) {
        currentStopIndex = pastStops.length;
    }

    let lastKnownLocation = originStop.name;
    if (train.Distruption?.LocationCode) {
        const matchingStop = stations.find((s: any) => s.stationCode === train.Distruption.LocationCode);
        lastKnownLocation = matchingStop?.name ?? "--";
    }

    return {
        currentStopIndex,
        lastKnownLocation,
        lastUpdate,
        status: "active",
        category: "AV",
        number: train.TrainNumber,
        origin: capitalize(train.DepartureStationDescription),
        destination: capitalize(train.ArrivalStationDescription),
        departureTime: originDeparture as string,
        arrivalTime: timeToISO(train.ArrivalDate, baseDate) as string,
        delay: globalDelay,
        alertMessage: null,
        stops,
        info: [],
        clientId: 3,
        company: "italo",
        color: "CA2A31",
    };
}