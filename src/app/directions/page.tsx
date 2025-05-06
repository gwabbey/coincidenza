"use client";

import { getDirections } from "@/api/otp/directions";

import { type Directions } from "@/api/otp/types";
import { type Location } from "@/types";

import { Button, DateInput, TimeInput } from "@heroui/react";
import { CalendarDate, Time } from "@internationalized/date";
import { IconArrowDown, IconSearch } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { LocationAutocomplete } from "./autocomplete";
import Results from "./results";

interface SelectedLocations {
    from: Location | null;
    to: Location | null;
}

export default function Directions() {
    const [selectedLocations, setSelectedLocations] = useState<SelectedLocations>({
        from: null,
        to: null
    });
    const [date, setDate] = useState<CalendarDate>(new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
    const [time, setTime] = useState<Time>(new Time(new Date().getHours(), new Date().getMinutes()));
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [directions, setDirections] = useState<Directions>();
    const toInputRef = useRef<HTMLInputElement>(null);

    const handleLocationSelect = (type: 'from' | 'to', location: Location | null) => {
        setSelectedLocations(prev => ({
            ...prev,
            [type]: location
        }));
    };

    const handleSearch = async () => {
        if (selectedLocations.from && selectedLocations.to && date && time) {
            setIsLoading(true);
            try {
                const combinedDateTime = new Date(
                    date.year,
                    date.month - 1,
                    date.day,
                    time.hour,
                    time.minute
                );

                const localIsoString = combinedDateTime.toISOString();

                const directions = await getDirections(selectedLocations.from.coordinates, selectedLocations.to.coordinates, localIsoString);
                console.log(directions)
                setDirections(directions);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleLoadMore = async () => {
        if (!directions?.nextPageCursor) return;

        setIsLoadingMore(true);
        try {
            const combinedDateTime = new Date(
                date.year,
                date.month - 1,
                date.day,
                time.hour,
                time.minute
            );

            const localIsoString = combinedDateTime.toISOString();

            const moreDirections = await getDirections(
                selectedLocations.from?.coordinates!,
                selectedLocations.to?.coordinates!,
                localIsoString,
                directions.nextPageCursor
            );

            setDirections(prev => prev ? {
                ...moreDirections,
                trips: [...prev.trips, ...moreDirections.trips]
            } : moreDirections);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const isSameLocation = selectedLocations.from?.coordinates.lat === selectedLocations.to?.coordinates.lat &&
        selectedLocations.from?.coordinates.lon === selectedLocations.to?.coordinates.lon;

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center">Cerca itinerario</h1>
            <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                <LocationAutocomplete
                    name="from"
                    label="partenza"
                    nextInputRef={toInputRef}
                    onLocationSelect={(location) => handleLocationSelect('from', location)}
                />
                <LocationAutocomplete
                    name="to"
                    label="arrivo"
                    ref={toInputRef}
                    onLocationSelect={(location) => handleLocationSelect('to', location)}
                />
                <div className="flex flex-row justify-center items-center gap-4 max-w-md w-full">
                    <DateInput
                        variant="underlined"
                        label="data"
                        size="lg"
                        isInvalid={new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) > date}
                        defaultValue={new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())}
                        onChange={(date) => setDate(date instanceof CalendarDate ? date : new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()))}
                    />
                    <TimeInput
                        variant="underlined"
                        label="ora"
                        size="lg"
                        hourCycle={24}
                        defaultValue={new Time(new Date().getHours(), new Date().getMinutes())}
                        onChange={(time) => setTime(time instanceof Time ? time : new Time(new Date().getHours(), new Date().getMinutes()))}
                    />
                </div>
            </div>
            <Button
                onPress={handleSearch}
                variant="ghost"
                color="primary"
                className="self-center font-bold max-w-md md:max-w-32 w-full"
                startContent={!isLoading && <IconSearch stroke={1.5} />}
                isDisabled={!selectedLocations.from || !selectedLocations.to || !date || !time || isLoading || (selectedLocations && isSameLocation) || new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) > date}
                isLoading={isLoading}
            >
                {!isLoading && "cerca!"}
            </Button>


            {directions && <Results directions={directions} />}

            {directions && directions.trips.length === 0 && (
                <div className="pointer-events-auto text-center max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold">nessun itinerario trovato</h1>
                    potresti aver cercato un viaggio in un'area non supportata dall'applicazione,
                    oppure non ci sono viaggi nell'orario selezionato.
                </div>
            )}
            {directions && directions.trips.length > 0 && directions.nextPageCursor && (
                <Button
                    startContent={!isLoadingMore && <IconArrowDown />}
                    variant="ghost"
                    onPress={handleLoadMore}
                    isLoading={isLoadingMore}
                    className="self-center max-w-md md:max-w-32 w-full"
                >
                    {!isLoadingMore && "carica altri"}
                </Button>
            )}
        </div>
    );
}