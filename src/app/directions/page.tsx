"use client";

import {getDirections} from "@/api/motis/directions";
import {type Directions} from "@/api/motis/types";
import {type Location} from "@/types";
import {Button, Card, DateInput, DateValue, Link, TimeInput, TimeInputValue} from "@heroui/react";
import {CalendarDate, Time} from "@internationalized/date";
import {IconArrowsLeftRight, IconArrowsUpDown, IconMap, IconSearch, IconWalk} from "@tabler/icons-react";
import {useState} from "react";
import {LocationAutocomplete} from "./autocomplete";
import Results from "./results";
import {formatDuration} from "@/utils";
import {format} from "date-fns";
import {I18nProvider} from "@react-aria/i18n";
import LeafletMap from "@/components/leaflet";

interface SelectedLocations {
    from: Location | null;
    to: Location | null;
}

const getItalyDateTime = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Rome",
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(new Date());

    const partsMap = new Map(parts.map(p => [p.type, p.value]));

    const hour = parseInt(partsMap.get('hour') || '0');

    return {
        year: parseInt(partsMap.get('year') || '0'),
        month: parseInt(partsMap.get('month') || '0'),
        day: parseInt(partsMap.get('day') || '0'),
        hour: hour === 24 ? 0 : hour,
        minute: parseInt(partsMap.get('minute') || '0'),
    };
};

export default function Directions() {
    const {year, month, day, hour, minute} = getItalyDateTime();
    const [selectedLocations, setSelectedLocations] = useState<SelectedLocations>({
        from: null, to: null,
    });
    const today = new CalendarDate(year, month, day);
    const nextWeek = new CalendarDate(year, month, day + 7);
    const [date, setDate] = useState<DateValue | null>(new CalendarDate(year, month, day));
    const [time, setTime] = useState<TimeInputValue | null>(new Time(hour, minute));
    const [directions, setDirections] = useState<Directions>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null);

    const handleLocationSelect = (type: "from" | "to", location: Location | null) => {
        setSelectedLocations((prev) => ({
            ...prev, [type]: location,
        }));
    };

    const handleSearch = async () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!selectedLocations.from || !selectedLocations.to || !date || !time) return;

        setIsLoading(true);
        setError(null);
        setDirections(undefined);

        try {
            const localIsoString = new Date(date.year, date.month - 1, date.day, time.hour, time.minute)
                .toLocaleString("sv-SE", {timeZone: "Europe/Rome"})
                .replace(" ", "T");

            const result = await getDirections({
                lat: selectedLocations.from.coordinates!.lat,
                lon: selectedLocations.from.coordinates!.lon,
                text: selectedLocations.from.label.toString(),
                isTrainStation: selectedLocations.from.isTrainStation ?? false,
            }, {
                lat: selectedLocations.to.coordinates!.lat,
                lon: selectedLocations.to.coordinates!.lon,
                text: selectedLocations.to.label.toString(),
                isTrainStation: selectedLocations.to.isTrainStation ?? false,
            }, localIsoString);

            if (!result) {
                setError("Errore nel recupero dei dati. Riprova più tardi.");
            } else if ((!result.trips || result.trips.length === 0) && (!result.direct || result.direct.length === 0)) {
                setError("Nessun itinerario trovato per la ricerca effettuata.");
            } else {
                setDirections(result);
            }
        } catch (e) {
            console.error(e);
            setError("Errore durante la comunicazione con il servizio. Riprova più tardi.");
        } finally {
            setIsLoading(false);
        }
    };

    const isSameLocation = selectedLocations.from?.coordinates!.lat === selectedLocations.to?.coordinates!.lat && selectedLocations.from?.coordinates!.lon === selectedLocations.to?.coordinates!.lon;

    const mapData = selectedLocations.from ? {
        from: {
            lat: selectedLocations.from.coordinates!.lat,
            lon: selectedLocations.from.coordinates!.lon,
            name: selectedLocations.from.label.toString(),
        },
        to: selectedLocations.to ? {
            lat: selectedLocations.to.coordinates!.lat,
            lon: selectedLocations.to.coordinates!.lon,
            name: selectedLocations.to.label.toString(),
        } : undefined,
        intermediateStops: selectedTripIndex !== null && directions?.trips[selectedTripIndex] ? directions.trips[selectedTripIndex].legs.flatMap((leg) => leg.intermediateStops?.map((stop) => ({
            lat: stop.lat, lon: stop.lon, name: stop.name,
        })) ?? []) : [],
        legs: selectedTripIndex !== null && directions?.trips[selectedTripIndex] ? directions.trips[selectedTripIndex].legs : [],
    } : undefined;

    return (<div className="flex flex-col">
        <LeafletMap
            from={mapData?.from}
            to={mapData?.to}
            intermediateStops={mapData?.intermediateStops}
            legs={mapData?.legs}
            className="w-screen rounded-t-large sticky top-[72px] z-10 -mt-4"
        />

        <Card className="flex flex-col gap-4 p-4 -mt-8 z-20 max-h-3/4" fullWidth shadow="sm">
            <h1 className="text-2xl font-bold text-center">Pianifica il tuo viaggio</h1>

            <div className="flex flex-col md:flex-row justify-center items-center gap-x-4">
                <LocationAutocomplete
                    name="from"
                    label="partenza"
                    onLocationSelect={(location) => handleLocationSelect("from", location)}
                />
                <div className="w-full max-w-md flex items-center justify-end md:hidden">
                    <Button
                        isIconOnly
                        variant="ghost"
                        startContent={<IconArrowsUpDown size={20} className="shrink-0" />}
                        radius="full"
                        className="border-gray-500 border-1 -my-4 bg-content1"
                        aria-label="inverti selezione"
                    />
                </div>
                <Button
                    isIconOnly
                    variant="ghost"
                    startContent={<IconArrowsLeftRight size={20} className="shrink-0" />}
                    radius="full"
                    className="border-gray-500 border-1 self-center md:flex hidden"
                    aria-label="inverti selezione"
                />
                <LocationAutocomplete
                    name="to"
                    label="arrivo"
                    onLocationSelect={(location) => handleLocationSelect("to", location)}
                />
                <div className="flex flex-row justify-center items-center gap-4 max-w-md w-full">
                    <I18nProvider locale="it-IT">
                        <DateInput
                            variant="underlined"
                            label="data"
                            classNames={{label: "text-sm"}}
                            size="lg"
                            isInvalid={date ? (today > date || date > nextWeek) : false}
                            value={date}
                            onChange={setDate}
                        />
                        <TimeInput
                            variant="underlined"
                            label="ora"
                            classNames={{label: "text-sm"}}
                            size="lg"
                            hourCycle={24}
                            value={time}
                            onChange={setTime}
                        />
                    </I18nProvider>
                </div>
            </div>

            <Button
                onPress={handleSearch}
                variant="ghost"
                color="primary"
                className="self-center font-bold max-w-md md:max-w-32 w-full text-lg"
                startContent={!isLoading && <IconSearch stroke={2} className="shrink-0" />}
                isDisabled={!selectedLocations.from || !selectedLocations.to || !date || !time || isLoading || (selectedLocations && isSameLocation) || today > date || date > nextWeek}
                isLoading={isLoading}
            >
                {!isLoading && "cerca"}
            </Button>

            {error && (<div className="pointer-events-auto text-center max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold">
                    {error.includes("Nessun") ? "Nessun itinerario trovato" : "Errore"}
                </h1>
                <p>{error}</p>
            </div>)}

            {directions && directions.direct.length > 0 && (<Card className="p-4 w-full mx-auto">
                <div className="flex flex-row justify-between">
                    <div className="flex flex-row gap-2 items-center">
                        <IconWalk size={24} />
                        <div className="flex flex-col justify-center">
                                    <span className="sm:text-lg text-md font-bold">
                                        circa{" "}
                                        {formatDuration(Math.abs(directions.direct[0].legs[0].duration / 60), true)}{" "}
                                        a piedi
                                    </span>
                            <span className="font-bold text-foreground-500">
                                        arrivo stimato alle{" "}
                                {format(directions.direct[0].legs[0].endTime, "HH:mm")}
                                    </span>
                        </div>
                    </div>
                    <Button
                        as={Link}
                        href={`https://maps.apple.com/?saddr=${directions.direct[0].legs[0].from.lat},${directions.direct[0].legs[0].from.lon}&daddr=${directions.direct[0].legs[0].to.lat},${directions.direct[0].legs[0].to.lon}&dirflg=w`}
                        variant="bordered"
                        isIconOnly
                        isExternal
                        startContent={<IconMap />}
                        radius="full"
                        className="border-gray-500 border-1 self-center"
                        aria-label="percorso a piedi"
                    />
                </div>
            </Card>)}

            {directions && <Results directions={directions} selectedTripIndex={selectedTripIndex}
                                    onTripSelect={setSelectedTripIndex} />}
        </Card>
    </div>);
}