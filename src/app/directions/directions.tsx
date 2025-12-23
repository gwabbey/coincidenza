"use client";

import {getDirections} from "@/api/motis/directions";
import {type Directions, type Location} from "@/api/motis/types";
import {Button, Card, DateInput, Link, TimeInput, TimeInputValue} from "@heroui/react";
import {CalendarDate, type DateValue, Time} from "@internationalized/date";
import {
    IconArrowDown,
    IconArrowRight,
    IconArrowsLeftRight,
    IconArrowsUpDown,
    IconCircleLetterA,
    IconCircleLetterBFilled,
    IconMap,
    IconPencil,
    IconSearch,
    IconWalk
} from "@tabler/icons-react";
import {useState} from "react";
import {LocationAutocomplete} from "./autocomplete";
import Results from "./results";
import {formatDuration} from "@/utils";
import {format} from "date-fns";
import {I18nProvider} from "@react-aria/i18n";
import Map from "@/components/map";

interface SelectedLocations {
    from: Location | null;
    to: Location | null;
}

export default function Directions({recent}: { recent: { from: Location, to: Location } | null }) {
    const [selectedLocations, setSelectedLocations] = useState<SelectedLocations>({
        from: null, to: null,
    });
    const dateTime = new Date();
    const today = new CalendarDate(dateTime.getFullYear(), dateTime.getMonth() + 1, dateTime.getDate());
    const nextWeek = new CalendarDate(dateTime.getFullYear(), dateTime.getMonth() + 1, dateTime.getDate() + 7);

    const [date, setDate] = useState<DateValue | null>(today);
    const [time, setTime] = useState<TimeInputValue | null>(new Time(dateTime.getHours(), dateTime.getMinutes()));

    const [directions, setDirections] = useState<Directions>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null);

    const handleLocationSelect = (type: "from" | "to", location: Location | null) => {
        if (location) {
            setSelectedLocations((prev) => ({
                ...prev, [type]: location,
            }));
        }
    };

    const handleSearch = async () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!selectedLocations.from || !selectedLocations.to || !date || !time) return;

        setIsLoading(true);
        setError(null);
        setDirections(undefined);
        setSelectedTripIndex(null);

        try {
            const combinedDateTime = new Date(date.year, date.month - 1, date.day, time.hour, time.minute);
            const localIsoString = combinedDateTime.toISOString();

            const result = await getDirections({
                id: selectedLocations.from!.id,
                lat: selectedLocations.from!.lat,
                lon: selectedLocations.from!.lon,
                name: selectedLocations.from!.name,
                address: selectedLocations.from!.address,
            }, {
                id: selectedLocations.to!.id,
                lat: selectedLocations.to!.lat,
                lon: selectedLocations.to!.lon,
                name: selectedLocations.to!.name,
                address: selectedLocations.to!.address,
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

    const isSameLocation = selectedLocations.from?.lat === selectedLocations.to?.lat && selectedLocations.from?.lon === selectedLocations.to?.lon;

    const mapData = selectedLocations.from ? {
        from: {
            lat: selectedLocations.from.lat, lon: selectedLocations.from.lon, name: selectedLocations.from.name,
        },

        to: selectedLocations.to ? {
            lat: selectedLocations.to.lat, lon: selectedLocations.to.lon, name: selectedLocations.to.name,
        } : undefined,

        intermediateStops: selectedTripIndex !== null && directions?.trips[selectedTripIndex] ? directions.trips[selectedTripIndex].legs
            .flatMap((leg, legIndex, legs) => {
                const stops: { lat: number; lon: number; name: string }[] = [];

                if (legs[legIndex].from.name !== "Start" && legs[legIndex].from.name !== selectedLocations!.from?.name) {
                    stops.push({
                        lat: leg.from.lat, lon: leg.from.lon, name: leg.from.name,
                    });
                }

                stops.push(...(leg.intermediateStops ?? []).map((stop) => ({
                    lat: stop.lat, lon: stop.lon, name: stop.name,
                })));

                if (legs[legIndex].to.name !== "End" && legs[legIndex].to.name !== selectedLocations!.to?.name) {
                    stops.push({
                        lat: leg.to.lat, lon: leg.to.lon, name: leg.to.name,
                    });
                }

                return stops;
            })
            .filter((item, index, arr) => index === arr.findIndex((a) => a.lat === item.lat && a.lon === item.lon)) : [],
        legs: selectedTripIndex !== null && directions?.trips[selectedTripIndex] ? directions.trips[selectedTripIndex].legs : [],
    } : undefined;

    const swapLocations = () => {
        setSelectedLocations(prev => ({
            from: prev.to, to: prev.from,
        }));
    };

    return (<div className="fixed inset-0 flex flex-col pt-18 px-4">
        <Map
            from={{
                lat: parseFloat(mapData?.from?.lat ?? ""),
                lon: parseFloat(mapData?.from?.lon ?? ""),
                name: mapData?.from.name
            }}
            to={{
                lat: parseFloat(mapData?.to?.lat ?? ""),
                lon: parseFloat(mapData?.to?.lon ?? ""),
                name: mapData?.to?.name
            }}
            intermediateStops={mapData?.intermediateStops}
            legs={mapData?.legs}
            className="w-full h-1/2 rounded-t-large shrink-0"
        />

        <Card className="flex flex-col gap-2 p-4 -mt-4 z-20 flex-1 min-h-0 overflow-auto rounded-b-none" fullWidth>
            {!directions && <h1 className="text-2xl font-bold text-center shrink-0">Pianifica il tuo viaggio</h1>}

            {!directions ? (<div className="flex flex-col items-center gap-y-4 shrink-0">
                <div className="flex flex-col md:flex-row justify-center items-center gap-x-4 w-full">
                    <LocationAutocomplete
                        name="from"
                        selected={selectedLocations.from?.name}
                        label="partenza"
                        disabled={isLoading}
                        onLocationSelect={(location) => handleLocationSelect("from", location)}
                    />
                    <div className="w-full max-w-md flex items-center justify-end md:hidden">
                        <Button
                            isDisabled={isLoading}
                            isIconOnly
                            variant="ghost"
                            onPress={swapLocations}
                            startContent={<IconArrowsUpDown size={20} className="shrink-0" />}
                            radius="full"
                            className="border-gray-500 border -my-8 bg-content1 z-10"
                            aria-label="inverti selezione"
                        />
                    </div>
                    <Button
                        isDisabled={isLoading}
                        isIconOnly
                        variant="ghost"
                        onPress={swapLocations}
                        startContent={<IconArrowsLeftRight size={20} className="shrink-0" />}
                        radius="full"
                        className="border-gray-500 border self-center md:flex hidden"
                        aria-label="inverti selezione"
                    />
                    <LocationAutocomplete
                        name="to"
                        selected={selectedLocations.to?.name}
                        label="arrivo"
                        disabled={isLoading}
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
                                isDisabled={isLoading}
                                value={date}
                                onChange={setDate}
                            />
                            <TimeInput
                                variant="underlined"
                                label="ora"
                                classNames={{label: "text-sm"}}
                                isDisabled={isLoading}
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
                    {!isLoading && "Cerca"}
                </Button>

                {error && (<div className="pointer-events-auto text-center max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold">
                        {error.includes("Nessun") ? "Nessun itinerario trovato" : "Errore"}
                    </h1>
                    <p>{error}</p>
                </div>)}
            </div>) : (<>
                <Card
                    className="flex flex-row sm:flex-col justify-between sm:justify-center items-center p-4 shrink-0">
                    <div className="sm:text-center sm:text-nowrap">
                        <div
                            className="flex flex-col sm:flex-row gap-1 font-bold sm:justify-center justify-start">
                            <div className="flex">
                                <IconCircleLetterA size={18} className="self-center shrink-0 mr-1 sm:hidden" />
                                {selectedLocations.from?.name}
                            </div>
                            <IconArrowDown size={16} stroke={2.5} className="shrink-0 sm:hidden" />
                            <IconArrowRight size={16} stroke={2.5}
                                            className="shrink-0 self-center hidden sm:flex" />
                            <div className="flex">
                                <IconCircleLetterBFilled size={18}
                                                         className="self-center shrink-0 mr-1 sm:hidden" />
                                {selectedLocations.to?.name}
                            </div>
                        </div>
                        {date && time && (<div>
                            {new Date(date.toString()).toLocaleDateString("it-IT", {
                                day: "numeric", month: "long"
                            })}, {format(new Date(date.year, date.month, date.day, time.hour, time.minute), "HH:mm")}
                        </div>)}
                        <Button
                            startContent={<IconPencil className="shrink-0" />}
                            onPress={() => setDirections(undefined)}
                            variant="bordered"
                            radius="full"
                            className="hidden sm:flex mx-auto mt-2 border-gray-500 border text-medium"
                        >
                            modifica
                        </Button>
                    </div>
                    <Button
                        isIconOnly
                        startContent={<IconPencil className="shrink-0" />}
                        variant="bordered"
                        radius="full"
                        onPress={() => setDirections(undefined)}
                        className="sm:hidden border-gray-500 border"
                    />
                </Card>

                {directions.direct.length > 0 && (<Card className="p-4 w-full mx-auto shrink-0">
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
                            className="border-gray-500 border self-center"
                            aria-label="percorso a piedi"
                        />
                    </div>
                </Card>)}

                <Results
                    directions={directions}
                    selectedTripIndex={selectedTripIndex}
                    onTripSelect={setSelectedTripIndex}
                />
            </>)}
        </Card>
    </div>);
}