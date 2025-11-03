"use client";

import {geocodeAddress} from "@/api/apple-maps/geolocation";
import {searchStation} from "@/api/nominatim/geolocation";
import {Location} from "@/types";
import {capitalize} from "@/utils";
import {addToast, Autocomplete, AutocompleteItem, Button, cn, Spinner} from "@heroui/react";
import {IconMapPin, IconTrain} from "@tabler/icons-react";
import {Key, useEffect, useState} from "react";
import {useDebouncedCallback} from 'use-debounce';

interface Props {
    name: string;
    label?: string;
    selected?: string;
    debounceDelay?: number;
    disabled?: boolean;
    onLocationSelect: (location: Location | null) => void;
}

export const LocationAutocomplete = ({
                                         label = "",
                                         selected = "",
                                         debounceDelay = 1000,
                                         disabled = false,
                                         onLocationSelect,
                                     }: Props) => {
    const [value, setValue] = useState(selected);
    const [items, setItems] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    useEffect(() => {
        if (selected) {
            setValue(selected);
        }
    }, [selected]);

    if (typeof window !== 'undefined' && !navigator.geolocation) {
        addToast({title: "Geolocalizzazione non supportata!"});
        return;
    }

    const getCurrentPosition = () => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 10000, maximumAge: 300000
            });
        });
    };

    const onSelectionChange = async (key: Key | null) => {
        if (!key) return;

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (key === 'current-location') {
            try {
                const locationLabel = 'Posizione attuale';
                setValue(locationLabel);

                const position = await getCurrentPosition();
                const coords = {
                    lat: position.coords.latitude, lon: position.coords.longitude
                };
                setUserLocation(coords);

                const locationData = {
                    value: 'current-location', label: locationLabel, textValue: locationLabel, coordinates: coords
                };

                setSelectedLocation(locationData);
                onLocationSelect(locationData);

                return;
            } catch (error) {
                const errorMessage = error instanceof GeolocationPositionError ? error.code === 1 ? "Accesso alla posizione negato. Controlla i permessi del browser." : error.code === 2 ? "Posizione non disponibile. Verifica che il GPS sia attivo." : "Timeout nel recupero della posizione." : "Errore nel recupero della posizione.";

                addToast({title: errorMessage});
                return;
            }
        }

        const selected = items.find(item => item.value === key);
        if (selected) {
            const displayValue = typeof selected.label === 'string' ? selected.label : selected.textValue || '';

            setValue(displayValue);
            setSelectedLocation(selected);
            onLocationSelect(selected);
        }
    };

    const onInputChange = (value: string) => {
        setValue(value);
        if (!selectedLocation || value !== (selectedLocation.textValue || selectedLocation.label)) {
            setSelectedLocation(null);
            onLocationSelect(null);
            if (value !== 'Posizione attuale') {
                fetchData(value);
            }
        }
    };

    const fetchData = useDebouncedCallback(async (query: string) => {
        if (!query || query.trim().length === 0) {
            setItems([]);
            return;
        }

        setLoading(true);

        try {
            const stations = await searchStation(query);
            const stationLocations = stations.features.map((feature: any) => ({
                value: feature.properties.osm_id.toString(),
                label: capitalize(feature.properties.name),
                textValue: capitalize(feature.properties.name),
                coordinates: {
                    lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0],
                },
                isTrainStation: true,
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
                address: [location.structuredAddress?.locality ?? location.displayLines[1], location.structuredAddress?.fullThoroughfare ?? location.structuredAddress?.subLocality].filter(Boolean).join(', '),
                coordinates: {
                    lat: location.location.latitude, lon: location.location.longitude
                }
            }));

            const currentLocationOption = {
                value: 'current-location', label: 'Posizione attuale', textValue: 'Posizione attuale', coordinates: null
            };

            setItems([currentLocationOption, ...stationLocations, ...locations]);
        } catch (error) {
            addToast({title: "Errore durante la ricerca."});
        } finally {
            setLoading(false);
        }
    }, debounceDelay);

    useEffect(() => {
        const currentLocationOption = {
            value: 'current-location',
            label: 'Posizione attuale',
            textValue: 'Posizione attuale',
            coordinates: {lat: 0, lon: 0}
        };
        setItems([currentLocationOption]);
    }, []);

    return (<Autocomplete
        label={label}
        selectedKey={selectedLocation?.value}
        value={value}
        allowsCustomValue
        selectorIcon={<></>}
        variant="underlined"
        onInputChange={onInputChange}
        onSelectionChange={onSelectionChange}
        isDisabled={disabled}
        endContent={loading ? <Spinner size="sm" color="default" /> : (
            <Button isIconOnly startContent={<IconMapPin className="shrink-0" />} radius="full"
                    variant="light" size="sm"
                    onPress={() => onSelectionChange("current-location")} />)}
        className="max-w-md"
        classNames={{
            selectorButton: "hidden", endContentWrapper: "mr-0"
        }}
        items={items}
        listboxProps={{
            emptyContent: "nessun risultato."
        }}
        size="lg"
    >
        {(item: Location) => (<AutocompleteItem
            key={item.value}
            textValue={item.textValue || (typeof item.label === 'string' ? item.label : 'Posizione attuale')}
            startContent={item.isTrainStation ? <IconTrain stroke={1.5} /> : item.value === 'current-location' ?
                <IconMapPin stroke={1.5} /> : undefined}
        >
            {typeof item.label === 'string' ? (<div className="flex flex-col">
                <span className={cn(item.label === "Posizione attuale" && "font-bold")}>{item.label}</span>
                {item.address && <span className="text-sm text-default-400">{item.address}</span>}
                {item.isTrainStation && <span className="text-sm text-default-400">Stazione</span>}
            </div>) : item.label}
        </AutocompleteItem>)}
    </Autocomplete>);
};