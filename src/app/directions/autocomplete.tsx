"use client";

import { geocodeAddress } from "@/api/apple-maps/geolocation";
import { searchStation } from "@/api/bahn/api";
import { Location } from "@/types";
import { capitalize } from "@/utils";
import { addToast, Autocomplete, AutocompleteItem, Spinner } from "@heroui/react";
import { IconMapPin, IconTrain } from "@tabler/icons-react";
import { Key, useEffect, useState } from "react";
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    name: string;
    label?: string;
    selected?: string;
    debounceDelay?: number;
    disabled?: boolean;
    onLocationSelect: (location: Location | null) => void;
    nextInputRef?: React.RefObject<HTMLInputElement>;
    ref?: React.RefObject<HTMLInputElement>;
}

export const LocationAutocomplete = ({
    label = "",
    selected = "",
    debounceDelay = 1000,
    disabled = false,
    onLocationSelect,
    nextInputRef,
    ref
}: Props) => {
    const [value, setValue] = useState(selected);
    const [data, setData] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    useEffect(() => {
        if (selected) {
            setValue(selected);
        }
    }, [selected]);

    const getCurrentPosition = () => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    };

    const onSelectionChange = async (key: Key | null) => {
        if (!key) return;

        if (key === 'current-location') {
            try {
                const position = await getCurrentPosition();
                const coords = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                setUserLocation(coords);

                const locationLabel = 'La tua posizione';
                setValue(locationLabel);

                const locationData = {
                    value: 'current-location',
                    label: locationLabel,
                    textValue: locationLabel,
                    coordinates: coords
                };

                setSelectedLocation(locationData);
                onLocationSelect(locationData);

                setTimeout(() => {
                    nextInputRef?.current?.focus();
                }, 50);

                return;
            } catch (error) {
                const errorMessage = error instanceof GeolocationPositionError
                    ? error.code === 1
                        ? "Accesso alla posizione negato. Controlla i permessi del browser."
                        : error.code === 2
                            ? "Posizione non disponibile. Verifica che il GPS sia attivo."
                            : "Timeout nel recupero della posizione."
                    : "Errore nel recupero della posizione.";

                addToast({ title: errorMessage });
                console.error('Error getting current position:', error);
                return;
            }
        }

        const selected = data.find(item => item.value === key);
        if (selected) {
            const displayValue = typeof selected.label === 'string' ? selected.label : selected.textValue || '';

            setValue(displayValue);
            setSelectedLocation(selected);
            onLocationSelect(selected);
            setTimeout(() => {
                nextInputRef?.current?.focus();
            }, 50);
        }
    };

    const onInputChange = (value: string) => {
        setValue(value);
        if (!selectedLocation || value !== (selectedLocation.textValue || selectedLocation.label)) {
            setSelectedLocation(null);
            onLocationSelect(null);
            if (value !== 'La tua posizione') {
                fetchData(value);
            }
        }
    };

    const fetchData = useDebouncedCallback(async (query: string) => {
        if (!query || query.trim().length === 0) {
            setData([]);
            return;
        }

        setLoading(true);

        try {
            const bahnStations = await searchStation(query);
            const bahnStationLocations = bahnStations.map((station: any) => ({
                value: `bahn-${station.id}`,
                label: capitalize(station.name),
                textValue: capitalize(station.name),
                coordinates: {
                    lat: station.lat,
                    lon: station.lon
                },
                isBahnStation: true
            }));

            const search = await geocodeAddress(query, {
                limitToCountries: 'IT',
                lang: 'it-IT',
                userLocation: userLocation ? `${userLocation.lat},${userLocation.lon}` : undefined,
                searchLocation: '46.0722416,11.1193186'
            });

            const locations = search.results.map((location: any) => ({
                value: JSON.stringify(location),
                label: location.displayLines[0],
                textValue: location.displayLines[0],
                address: [
                    location.structuredAddress?.locality ?? location.displayLines[1],
                    location.structuredAddress?.fullThoroughfare ?? location.structuredAddress?.subLocality
                ].filter(Boolean).join(', '),
                coordinates: {
                    lat: location.location.latitude,
                    lon: location.location.longitude
                }
            }));

            setData([...bahnStationLocations, ...locations]);
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log("Request aborted");
                return;
            }
            console.error("Error fetching location data:", error);
        } finally {
            setLoading(false);
        }
    }, debounceDelay);

    const currentLocationItem: Location = {
        value: 'current-location',
        label: <div className="flex flex-row items-center gap-2 font-bold"><IconMapPin stroke={1.5} />La tua posizione</div>,
        textValue: 'La tua posizione',
        coordinates: userLocation ?? { lat: 0, lon: 0 }
    };

    const allItems = [currentLocationItem, ...data];

    return (
        <Autocomplete
            label={label}
            selectedKey={selectedLocation?.value}
            value={value}
            allowsCustomValue
            variant="underlined"
            onInputChange={onInputChange}
            onSelectionChange={onSelectionChange}
            isDisabled={disabled}
            endContent={loading && <Spinner size="sm" color="default" />}
            className="max-w-md"
            items={allItems}
            ref={ref}
            listboxProps={{
                emptyContent: "nessun risultato."
            }}
            size="lg"
        >
            {(item: Location) => (
                <AutocompleteItem
                    key={item.value}
                    textValue={item.textValue || (typeof item.label === 'string' ? item.label : 'La tua posizione')}
                    startContent={item.isBahnStation ? <IconTrain stroke={1.5} /> : undefined}
                >
                    {typeof item.label === 'string' ? (
                        <div className="flex flex-col">
                            <span className="text-sm">{item.label}</span>
                            <span className="text-xs text-default-400">{item.address}</span>
                        </div>
                    ) : item.label}
                </AutocompleteItem>
            )}
        </Autocomplete>
    );
};