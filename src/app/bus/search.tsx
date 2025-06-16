"use client";

import { geocodeAddress } from "@/api/apple-maps/geolocation";
import { reverseGeocode } from "@/api/nominatim/geolocation";
import { getUserLocation } from '@/components/geolocation';
import { Location } from "@/types";
import { Autocomplete, AutocompleteItem, Button, Spinner } from "@heroui/react";
import { IconMapPin, IconStar, IconStarFilled } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Key, useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from 'use-debounce';

const useStarState = (favorites: any[]) => {
    const [isStarred, setIsStarred] = useState(false);

    const getCookieValue = (name: string) =>
        document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] ?? null;

    const checkIfStarred = useCallback(() => {
        const lat = parseFloat(getCookieValue('userLat') || '');
        const lon = parseFloat(getCookieValue('userLon') || '');

        if (isNaN(lat) || isNaN(lon)) {
            setIsStarred(false);
            return;
        }

        const starred = favorites.some(f =>
            Math.abs(f.lat - lat) < 0.0001 && Math.abs(f.lon - lon) < 0.0001
        );
        setIsStarred(starred);
    }, [favorites]);

    return { isStarred, setIsStarred, checkIfStarred };
};

interface LocationAutocompleteProps {
    label?: string;
    disabled?: boolean;
    debounceDelay?: number;
    favorites?: { lat: number, lon: number, name: string }[];
    initialLocationName?: string;
}

export const Search = ({
    label = "cerca un luogo",
    disabled = false,
    debounceDelay = 300,
    favorites = [],
    initialLocationName = '',
}: LocationAutocompleteProps) => {
    const router = useRouter();
    const [value, setValue] = useState("");
    const [data, setData] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const { isStarred, setIsStarred, checkIfStarred } = useStarState(favorites);
    const lastClickRef = useRef(0);

    const setCookie = (name: string, value: string) => {
        document.cookie = `${name}=${value}; path=/; max-age=${3600}`;
    };

    const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    };

    const getCookieValue = (name: string) =>
        document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] ?? null;

    const saveFavorites = (favorites: any[]) =>
        document.cookie = `favorites=${encodeURIComponent(JSON.stringify(favorites))}; path=/; max-age=31536000`;

    const toggleFavorite = async () => {
        const now = Date.now();
        if (now - lastClickRef.current < 1000) return;
        lastClickRef.current = now;

        const lat = parseFloat(getCookieValue('userLat') || '');
        const lon = parseFloat(getCookieValue('userLon') || '');
        if (isNaN(lat) || isNaN(lon)) return;

        const i = favorites.findIndex(f => Math.abs(f.lat - lat) < 0.0001 && Math.abs(f.lon - lon) < 0.0001);

        let name = "Posizione salvata";

        if (!value || value === "La tua posizione") {
            name = await reverseGeocode(lat, lon);
        } else {
            name = value;
        }

        if (i !== -1) {
            favorites.splice(i, 1);
            setIsStarred(false);
        } else {
            favorites.push({ lat, lon, name });
            setIsStarred(true);
        }

        saveFavorites(favorites);
        router.refresh();
    };

    const setUserLocationAsDefault = async () => {
        try {
            const { lat, lon } = await getUserLocation();
            setCookie('userLat', lat.toString());
            setCookie('userLon', lon.toString());
            setValue('La tua posizione');
            checkIfStarred();
        } catch (error) {
            console.error('Error getting user location:', error);
        }
    };

    useEffect(() => {
        const userLat = getCookie('userLat');
        const userLon = getCookie('userLon');

        if (!userLat || !userLon) {
            setUserLocationAsDefault();
        } else {
            if (initialLocationName) {
                setValue(initialLocationName);
                setIsStarred(true);
            } else {
                checkIfStarred();
            }
        }
    }, [checkIfStarred, initialLocationName]);

    const onSelectionChange = async (key: Key | null) => {
        if (!key) return;

        if (key === 'current-location') {
            await setUserLocationAsDefault();
            return;
        }

        const selectedItem = data.find(item => item.value === key);
        if (selectedItem && selectedItem.coordinates) {
            setCookie('userLat', selectedItem.coordinates.lat.toString());
            setCookie('userLon', selectedItem.coordinates.lon.toString());

            setValue(selectedItem.textValue || selectedItem.label as string);
            setSelectedLocation(selectedItem);
            checkIfStarred();
        }
        router.refresh();
    };

    const onInputChange = (value: string) => {
        setValue(value);
        if (!selectedLocation || value !== (selectedLocation.textValue || selectedLocation.label)) {
            setSelectedLocation(null);
            if (value !== 'La tua posizione') {
                fetchData(value);
            }
        }
    };

    const fetchData = useDebouncedCallback(async (query: string) => {
        if (!query || query.trim().length < 3) {
            setData([]);
            return;
        }

        setLoading(true);

        try {
            const geocodingResults = await geocodeAddress(query, {
                limitToCountries: 'IT',
                lang: 'it-IT',
                userLocation: `${getCookie('userLat') || "46.0722416"},${getCookie('userLon') || "11.1193186"}`,
                searchLocation: '46.0722416,11.1193186'
            });

            const geocodedLocations: Location[] = geocodingResults.results.map((location: any) => ({
                value: JSON.stringify(location),
                label: location.displayLines[0],
                textValue: location.displayLines[0],
                address: [
                    location.structuredAddress?.locality ?? location.displayLines[1],
                    location.structuredAddress?.fullThoroughfare ?? location.structuredAddress?.subLocality,
                ].filter(Boolean).join(', '),
                coordinates: {
                    lat: location.location.latitude,
                    lon: location.location.longitude,
                },
            }));

            setData(geocodedLocations);
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

    return (
        <div className="flex items-center justify-center gap-x-2">
            <Autocomplete
                label={label}
                selectedKey={selectedLocation?.value}
                inputValue={value}
                allowsCustomValue
                variant="underlined"
                onInputChange={onInputChange}
                onSelectionChange={onSelectionChange}
                isDisabled={disabled}
                endContent={loading && <Spinner size="sm" color="default" />}
                items={data}
                listboxProps={{
                    emptyContent: "nessun risultato.",
                }}
                size="lg"
                isClearable={false}
            >
                {(item: Location) => (
                    <AutocompleteItem
                        key={item.value}
                        textValue={item.textValue}
                    >
                        {typeof item.label === 'string' ? (
                            <div className="flex flex-col">
                                <span className="text-sm">{item.label}</span>
                                <span className="text-xs text-default-400">{item.address}</span>
                            </div>
                        ) : (
                            item.label
                        )}
                    </AutocompleteItem>
                )}
            </Autocomplete>
            <div className="flex gap-0">
                <Button
                    isIconOnly
                    onPress={toggleFavorite}
                    radius="full"
                    variant="bordered"
                    className="border-none"
                    startContent={
                        <motion.div
                            initial={false}
                            animate={isStarred ? { rotate: 360 } : { rotate: 0 }}
                            whileTap={{ scale: 1.2 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20
                            }}
                        >
                            {isStarred
                                ? <IconStarFilled className="text-warning" />
                                : <IconStar className="text-warning" />}
                        </motion.div>
                    }
                />
                <Button isIconOnly startContent={<IconMapPin />} radius="full" variant="bordered" onPress={setUserLocationAsDefault} className="border-none" />
            </div>
        </div>
    );
};