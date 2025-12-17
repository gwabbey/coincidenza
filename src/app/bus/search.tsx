"use client";

import {type Location, searchLocation} from "@/api/motis/geocoding";
import {Autocomplete, AutocompleteItem, Image, Spinner} from "@heroui/react";
import {IconBus, IconMapPin, IconTrain} from "@tabler/icons-react";
import {useRouter} from "next/navigation";
import {Key, useEffect, useRef, useState} from "react";
import {useDebouncedCallback} from 'use-debounce';
import {getUserLocation} from "@/components/geolocation";
/*
const useStarState = (favorites: any[]) => {
    const [isStarred, setIsStarred] = useState(false);

    const getCookieValue = (name: string) => document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] ?? null;

    const checkIfStarred = useCallback(() => {
        const lat = parseFloat(getCookieValue('userLat') || '');
        const lon = parseFloat(getCookieValue('userLon') || '');

        if (isNaN(lat) || isNaN(lon)) {
            setIsStarred(false);
            return;
        }

        const starred = favorites.some(f => Math.abs(f.lat - lat) < 0.0001 && Math.abs(f.lon - lon) < 0.0001);
        setIsStarred(starred);
    }, [favorites]);

    return {isStarred, setIsStarred, checkIfStarred};
};*/

export const Search = ({lat, lon, name, closest}: { lat: string, lon: string, name: string, closest: Location[] }) => {
    const router = useRouter();
    const [value, setValue] = useState(name);
    const [data, setData] = useState<Location[]>(closest ?? []);
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const hasRequestedLocation = useRef(false);

    const setCookie = (name: string, value: string) => {
        document.cookie = `${name}=${value}; path=/; expires=0`;
    };

    // const getCookieValue = (name: string) => document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] ?? null;

    // const saveFavorites = (favorites: any[]) => document.cookie = `favorites=${encodeURIComponent(JSON.stringify(favorites))}; path=/; max-age=31536000`;

    /* const toggleFavorite = async () => {
         const now = Date.now();
         if (now - lastClickRef.current < 1000) return;
         lastClickRef.current = now;

         const lat = parseFloat(getCookieValue('userLat') || '');
         const lon = parseFloat(getCookieValue('userLon') || '');
         if (isNaN(lat) || isNaN(lon)) return;

         const i = favorites.findIndex(f => Math.abs(f.lat - lat) < 0.0001 && Math.abs(f.lon - lon) < 0.0001);

         let name;

         if (!value || value === "La tua posizione") {
             name = await reverseGeocode(lat, lon);
         } else {
             name = value;
         }

         if (i !== -1) {
             favorites.splice(i, 1);
             setIsStarred(false);
         } else {
             favorites.push({lat, lon, name, type: 'bus', createdAt: new Date().toISOString()});
             setIsStarred(true);
         }

         saveFavorites(favorites);
         router.refresh();
     };*/

    const setUserLocationAsDefault = async () => {
        try {
            const {lat, lon} = await getUserLocation();
            setCookie('lat', lat.toString());
            setCookie('lon', lon.toString());
            setValue('La tua posizione');
        } catch (error) {
            setCookie('lat', '46.0722416');
            setCookie('lon', '11.1193186');
        } finally {
            router.refresh();
        }
    }

    useEffect(() => {
        if (hasRequestedLocation.current) return;
        hasRequestedLocation.current = true;

        if (!lat || !lon) {
            setUserLocationAsDefault();
        }
    }, []);

    const onSelectionChange = async (key: Key | null) => {
        if (!key) return;

        if (key === 'current-location') {
            await setUserLocationAsDefault();
            return;
        }

        const selectedItem = data.find(item => item.id === key);
        if (selectedItem && selectedItem.lat && selectedItem.lon) {
            setCookie('lat', selectedItem.lat.toString());
            setCookie('lon', selectedItem.lon.toString());
            setCookie('name', selectedItem.name);

            setValue(selectedItem.name);
            setSelectedLocation(selectedItem);
        }
        router.refresh();
    };

    const onInputChange = (value: string) => {
        setValue(value);
        if (!selectedLocation || value !== (selectedLocation.name)) {
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
            const search = await searchLocation({
                lat, lon, query
            });

            setData(search);
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log("Request aborted");
                return;
            }
            console.error("Error fetching location data:", error);
        } finally {
            setLoading(false);
        }
    }, 500);

    return (<div className="flex items-center justify-center gap-x-2">
        <Autocomplete
            label="Cerca..."
            selectedKey={`${selectedLocation?.lat}-${selectedLocation?.lon}-${selectedLocation?.id}`}
            inputValue={value}
            allowsCustomValue
            fullWidth
            variant="underlined"
            onInputChange={onInputChange}
            onSelectionChange={onSelectionChange}
            classNames={{
                selectorButton: "hidden", endContentWrapper: "mr-1"
            }}
            endContent={loading && <Spinner size="sm" color="default" />}
            items={value.trim() ? data : closest}
            listboxProps={{
                emptyContent: "Nessun risultato.",
            }}
            size="lg"
        >
            {(item: Location) => (<AutocompleteItem
                startContent={item.category && item.category !== "none" ? (<Image
                    width={24} radius="none" className="w-6"
                    src={`https://motis.g3b.dev/icons/${item.category}.svg`}
                />) : item.modes?.some(mode => mode.includes("RAIL")) ? (
                    <IconTrain />) : item.modes?.some(mode => mode.includes("BUS")) ? (<IconBus />) : (<IconMapPin />)}
                key={item.id}
                textValue={item.name}
            >
                <div className="flex flex-col">
                    <span className="text-sm">{item.name}</span>
                    <span className="text-xs text-default-400">{item.area}</span>
                </div>
            </AutocompleteItem>)}
        </Autocomplete>
        <div className="flex gap-0">
            {/*<Button
                    isIconOnly
                    onPress={toggleFavorite}
                    radius="full"
                    variant="bordered"
                    className="border-none"
                    startContent={
                        <motion.div
                            initial={false}
                            animate={isStarred ? {rotate: 360} : {rotate: 0}}
                            whileTap={{scale: 1.2}}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20
                            }}
                        >
                            {isStarred ?
                                <IconStarFilled className="text-warning" /> :
                                <IconStar className="text-warning" />
                            }
                        </motion.div>
                    }
                />*/}
        </div>
    </div>);
};