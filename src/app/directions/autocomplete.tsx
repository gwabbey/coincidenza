"use client";

import { geocodeAddress } from "@/api/apple-maps/geocoding";
import { Coordinates } from "@/types";
import { Autocomplete, AutocompleteItem, Spinner } from "@heroui/react";
import { IconMapPin } from "@tabler/icons-react";
import { Key, useState } from "react";
import { toast } from "react-hot-toast";
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    name: string;
    label?: string;
    selected?: string;
    debounceDelay?: number;
    disabled?: boolean;
    onLocationSelect: (coords: Coordinates | null) => void;
    nextInputRef?: React.RefObject<HTMLInputElement>;
    ref?: React.RefObject<HTMLInputElement>;
}

interface LocationData {
    value: string;
    label: string | JSX.Element;
    textValue?: string;
    address?: string;
    coordinates: Coordinates;
}

export const LocationAutocomplete = ({
    label = "",
    selected = "",
    debounceDelay = 500,
    disabled = false,
    onLocationSelect,
    nextInputRef,
    ref
}: Props) => {
    const [value, setValue] = useState(selected);
    const [data, setData] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

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
                setValue('La tua posizione');
                onLocationSelect(coords);
                setSelectedLocation({
                    value: 'current-location',
                    label: 'La tua posizione',
                    textValue: 'La tua posizione',
                    coordinates: coords
                });
                nextInputRef?.current?.focus();
                return;
            } catch (error) {
                const errorMessage = error instanceof GeolocationPositionError
                    ? error.code === 1
                        ? "Accesso alla posizione negato. Controlla i permessi del browser."
                        : error.code === 2
                            ? "Posizione non disponibile. Verifica che il GPS sia attivo."
                            : "Timeout nel recupero della posizione."
                    : "Errore nel recupero della posizione.";

                toast.error(errorMessage);
                console.error('Error getting current position:', error);
                return;
            }
        }

        const selected = data.find(item => item.value === key);
        if (selected) {
            setSelectedLocation(selected);
            setValue(typeof selected.label === 'string' ? selected.label : selected.textValue || '');
            onLocationSelect(selected.coordinates);
            nextInputRef?.current?.focus();
        }
    };

    const onInputChange = (value: string) => {
        console.log("Input value:", value);
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
        if (!query) {
            setData([]);
            return;
        }

        setLoading(true);
        console.log("Fetching locations for query:", query);

        try {
            const search = await geocodeAddress(query, {
                limitToCountries: 'IT',
                lang: 'it-IT',
                userLocation: userLocation ? `${userLocation.lat},${userLocation.lon}` : undefined,
                searchLocation: '46.0722416,11.1193186'
            });

            console.log("Search results:", search);

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

            console.log("Processed locations:", locations);
            setData(locations);
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

    const currentLocationItem: LocationData = {
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
            endContent={loading && <Spinner size="sm" />}
            className="max-w-md"
            items={allItems}
            ref={ref}
        >
            {(item: LocationData) => (
                <AutocompleteItem
                    key={item.value}
                    textValue={item.textValue || (typeof item.label === 'string' ? item.label : 'La tua posizione')}
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