"use client";

import { getDirections } from "@/api/otp/directions";
import { Button, DateInput, TimeInput } from "@heroui/react";
import { CalendarDate, Time } from "@internationalized/date";
import { IconArrowDown, IconSearch } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { LocationAutocomplete } from "./autocomplete";
import { type Directions, Trip } from "./types";
import Results from "./results";

interface Coordinates {
    lat: number;
    lon: number;
}

interface SelectedLocations {
    from: Coordinates | null;
    to: Coordinates | null;
}

export default function Directions() {
    // TODO: change values back once testing is done
    const [selectedLocations, setSelectedLocations] = useState<SelectedLocations>({
        from: { "lat": 45.93386, "lon": 11.09547 },
        to: { "lat": 45.89395, "lon": 11.04499 }
    });
    const [date, setDate] = useState<CalendarDate>(new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
    const [time, setTime] = useState<Time>(new Time(new Date().getHours(), new Date().getMinutes()));
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [directions, setDirections] = useState<Directions>();
    const toInputRef = useRef<HTMLInputElement>(null);

    console.log("directions", directions);

    const handleLocationSelect = (type: 'from' | 'to', coordinates: Coordinates | null) => {
        setSelectedLocations(prev => ({
            ...prev,
            [type]: coordinates
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

                const directions = await getDirections(selectedLocations.from, selectedLocations.to, localIsoString);
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
                selectedLocations.from!,
                selectedLocations.to!,
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

    const isSameLocation = selectedLocations.from?.lat === selectedLocations.to?.lat &&
        selectedLocations.from?.lon === selectedLocations.to?.lon;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                <LocationAutocomplete
                    name="from"
                    label="partenza"
                    nextInputRef={toInputRef}
                    onLocationSelect={(coords) => handleLocationSelect('from', coords)}
                />
                <LocationAutocomplete
                    name="to"
                    label="arrivo"
                    ref={toInputRef}
                    onLocationSelect={(coords) => handleLocationSelect('to', coords)}
                />
                <div className="flex flex-row justify-center items-center gap-4 max-w-md w-full">
                    <DateInput
                        variant="underlined"
                        label="data"
                        defaultValue={new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())}
                        onChange={(date) => setDate(date instanceof CalendarDate ? date : new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()))}
                    />
                    <TimeInput
                        variant="underlined"
                        label="ora"
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
                isDisabled={!selectedLocations.from || !selectedLocations.to || !date || !time || isLoading || (selectedLocations && isSameLocation)}
                isLoading={isLoading}
            >
                {!isLoading && "cerca!"}
            </Button>
            {directions && <Results directions={directions} />}
            {directions?.nextPageCursor && (
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