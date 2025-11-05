"use client";

import {geocodeAddress} from "@/api/apple-maps/geolocation";
import {searchStation} from "@/api/nominatim/geolocation";
import {Location} from "@/types";
import {capitalize} from "@/utils";
import {addToast, Autocomplete, AutocompleteItem, cn, Spinner} from "@heroui/react";
import {IconMapPin, IconTrain} from "@tabler/icons-react";
import {Key, useState} from "react";
import {useDebouncedCallback} from 'use-debounce';

interface Props {
    name: string;
    label?: string;
    selected?: string;
    debounceDelay?: number;
    disabled?: boolean;
    onLocationSelect: (location: Location | null) => void;
}

const CURRENT_LOCATION_KEY = 'current-location';
const CURRENT_LOCATION: Location = {
    value: CURRENT_LOCATION_KEY, label: 'Posizione attuale', textValue: 'Posizione attuale', coordinates: null
};

const GEOLOCATION_ERRORS: Record<number, string> = {
    1: "Accesso alla posizione negato. Controlla i permessi del browser.",
    2: "Posizione non disponibile. Verifica che il GPS sia attivo.",
    3: "Timeout nel recupero della posizione."
};

export const LocationAutocomplete = ({
                                         label = "",
                                         selected = "",
                                         debounceDelay = 1000,
                                         disabled = false,
                                         onLocationSelect,
                                     }: Props) => {
    const [value, setValue] = useState(selected);
    const [items, setItems] = useState<Location[]>([CURRENT_LOCATION]);
    const [loading, setLoading] = useState(false);

    const getCurrentPosition = (): Promise<GeolocationPosition> => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            return Promise.reject(new Error("Geolocalizzazione non supportata!"));
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 10000, maximumAge: 300000
            });
        });
    };

    const handleCurrentLocation = async () => {
        try {
            const position = await getCurrentPosition();
            const coords = {
                lat: position.coords.latitude, lon: position.coords.longitude
            };

            const locationData: Location = {
                ...CURRENT_LOCATION, coordinates: coords
            };

            setValue(CURRENT_LOCATION.label as string);
            onLocationSelect(locationData);
        } catch (error) {
            const errorMessage = error instanceof GeolocationPositionError ? GEOLOCATION_ERRORS[error.code] || "Errore nel recupero della posizione." : "Errore nel recupero della posizione.";

            addToast({title: errorMessage});
            setValue('');
            onLocationSelect(null);
        }
    };

    const onSelectionChange = async (key: Key | null) => {
        if (!key) return;

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (key === CURRENT_LOCATION_KEY) {
            await handleCurrentLocation();
            return;
        }

        const selected = items.find(item => item.value === key);
        if (selected) {
            setValue(selected.textValue || selected.label as string);
            onLocationSelect(selected);
        }
    };

    const onInputChange = (newValue: string) => {
        setValue(newValue);

        if (!newValue || newValue.trim().length === 0) {
            setItems([CURRENT_LOCATION]);
            onLocationSelect(null);
            return;
        }

        fetchData(newValue);
    };

    const fetchData = useDebouncedCallback(async (query: string) => {
        if (!query || query.trim().length === 0) {
            setItems([CURRENT_LOCATION]);
            return;
        }

        setLoading(true);

        try {
            let userCoords: { lat: number, lon: number } | null = null;
            try {
                const position = await getCurrentPosition();
                userCoords = {
                    lat: position.coords.latitude, lon: position.coords.longitude
                };
            } catch {
                // do nothing, user location is optional
            }

            const [stations, search] = await Promise.all([searchStation(query), geocodeAddress(query, {
                limitToCountries: 'IT',
                lang: 'it-IT',
                userLocation: userCoords ? `${userCoords.lat},${userCoords.lon}` : undefined,
                searchLocation: '46.0722416,11.1193186'
            })]);

            const stationLocations: Location[] = stations.features.map((feature: any) => ({
                value: feature.properties.osm_id.toString(),
                label: capitalize(feature.properties.name),
                textValue: capitalize(feature.properties.name),
                coordinates: {
                    lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0],
                },
                isTrainStation: true,
            }));

            const locations: Location[] = search.results.map((location: any) => ({
                value: JSON.stringify(location),
                label: location.displayLines[0],
                textValue: location.displayLines[0],
                address: [location.structuredAddress?.locality ?? location.displayLines[1], location.structuredAddress?.fullThoroughfare ?? location.structuredAddress?.subLocality].filter(Boolean).join(', '),
                coordinates: {
                    lat: location.location.latitude, lon: location.location.longitude
                }
            }));

            setItems([CURRENT_LOCATION, ...stationLocations, ...locations]);
        } catch (error) {
            addToast({title: "Errore durante la ricerca."});
            setItems([CURRENT_LOCATION]);
        } finally {
            setLoading(false);
        }
    }, debounceDelay);

    return (<Autocomplete
        label={label}
        selectedKey={null}
        inputValue={value}
        allowsCustomValue
        selectorIcon={<></>}
        variant="underlined"
        isClearable={false}
        onInputChange={onInputChange}
        onSelectionChange={onSelectionChange}
        isDisabled={disabled}
        endContent={loading && <Spinner size="sm" color="default" />}
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
            startContent={item.isTrainStation ?
                <IconTrain stroke={1.5} /> : item.value === CURRENT_LOCATION_KEY ?
                    <IconMapPin stroke={1.5} /> : undefined}
        >
            {typeof item.label === 'string' ? (<div className="flex flex-col">
                            <span className={cn(item.value === CURRENT_LOCATION_KEY && "font-bold")}>
                                {item.label}
                            </span>
                {item.address && <span className="text-sm text-default-400">{item.address}</span>}
                {item.isTrainStation && <span className="text-sm text-default-400">Stazione</span>}
            </div>) : item.label}
        </AutocompleteItem>)}
    </Autocomplete>);
};