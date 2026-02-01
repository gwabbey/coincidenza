"use client";

import {addToast, Autocomplete, AutocompleteItem, cn, Spinner} from "@heroui/react";
import {Key, useEffect, useState} from "react";
import {useDebouncedCallback} from 'use-debounce';
import {IconLocation} from "@tabler/icons-react";
import {searchLocation} from "@/api/apple-maps/geocoding";

interface Props {
    name: string;
    label?: string;
    selected?: string;
    debounceDelay?: number;
    disabled?: boolean;
    onLocationSelect: (location: any) => void;
}

const GEOLOCATION_ERRORS: Record<number, string> = {
    1: "Accesso alla posizione negato. Controlla i permessi del browser.",
    2: "Posizione non disponibile. Verifica che il GPS sia attivo.",
    3: "Timeout nel recupero della posizione."
};

const CURRENT_LOCATION = {
    id: "current-location", name: "La tua posizione", address: null, lat: null, lon: null,
};

export const LocationAutocomplete = ({
                                         label = "",
                                         selected = "",
                                         debounceDelay = 1000,
                                         disabled = false,
                                         onLocationSelect,
                                     }: Props) => {
    const [value, setValue] = useState(selected);
    const [items, setItems] = useState<any[]>([CURRENT_LOCATION]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setValue(selected);
    }, [selected]);

    const getCurrentLocation = (): Promise<GeolocationPosition> => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            return Promise.reject(new Error("Geolocalizzazione non supportata!"));
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 10000
            });
        });
    };

    const handleCurrentLocation = async () => {
        try {
            const position = await getCurrentLocation();

            const locationData = {
                name: "La tua posizione", lat: position.coords.latitude, lon: position.coords.longitude,
            };

            setValue("La tua posizione");
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

        if (key === "current-location") {
            await handleCurrentLocation();
            return;
        }

        const selected = items.find(item => item.id === key);
        if (selected) {
            setValue(selected.name);
            onLocationSelect(selected);
        }
    };

    const onInputChange = (newValue: string) => {
        setValue(newValue);

        if (!newValue || !newValue.trim()) {
            setItems([CURRENT_LOCATION]);
            return;
        }

        fetchData(newValue);
    };

    const onFocus = () => {
        if (!value || !value.trim()) {
            setItems([CURRENT_LOCATION]);
        }
    };

    const fetchData = useDebouncedCallback(async (query: string) => {
        if (!query || query.trim().length === 0) {
            setItems([CURRENT_LOCATION]);
            return;
        }

        const currentQuery = query;
        setLoading(true);

        try {
            if (query !== "La tua posizione") {
                const search = await searchLocation(query, {
                    userLocation: "46.0722416,11.1193186"
                });

                const locations = search.map((location: any) => ({
                    id: location.id,
                    name: location.name,
                    address: location.address,
                    lat: location.lat,
                    lon: location.lon,
                    category: location.category,
                }));

                if (value === currentQuery) {
                    setItems([CURRENT_LOCATION, ...locations]);
                }
            }
        } catch (error) {
            addToast({title: "Errore durante la ricerca."});
            setItems([CURRENT_LOCATION]);
        } finally {
            setLoading(false);
        }
    }, debounceDelay);

    return (<Autocomplete
        label={label}
        inputValue={value}
        variant="underlined"
        isClearable={false}
        allowsCustomValue
        onInputChange={onInputChange}
        onSelectionChange={onSelectionChange}
        onFocus={onFocus}
        isDisabled={disabled}
        endContent={loading && <Spinner size="sm" color="default" />}
        className="max-w-md"
        classNames={{
            selectorButton: "hidden", endContentWrapper: "mr-1"
        }}
        items={items}
        listboxProps={{
            emptyContent: "nessun risultato."
        }}
        popoverProps={{
            shouldCloseOnScroll: false
        }}
        size="lg"
    >
        {(item) => (<AutocompleteItem
            key={item.id}
            startContent={item.name === "La tua posizione" && <IconLocation className="shrink-0" />}
            textValue={item.name || 'La tua posizione'}
        >
            <div className="flex flex-col">
                            <span className={cn(item.name === "La tua posizione" && "font-bold")}>
                                {item.name}
                            </span>
                {item.address && <span className="text-sm text-default-400">{item.address}</span>}
            </div>
        </AutocompleteItem>)}
    </Autocomplete>);
};