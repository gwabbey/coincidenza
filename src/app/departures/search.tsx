"use client";

import stations from "@/stations.json";
import { Favorite } from "@/types";
import { Autocomplete, AutocompleteItem, Button } from "@heroui/react";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const getFavorites = (): any[] => {
    if (typeof window === 'undefined') {
        return [];
    }
    const cookie = document.cookie.split('; ').find(row => row.startsWith('favorites='));
    if (!cookie) {
        return [];
    }
    try {
        return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } catch (e) {
        return [];
    }
};

const saveFavorites = (favorites: any[]) => {
    document.cookie = `favorites=${encodeURIComponent(JSON.stringify(favorites))}; path=/; max-age=31536000`;
};

export default function Search({ selected }: { selected?: string }) {
    const router = useRouter();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isStarred, setIsStarred] = useState(false);

    const stationName = selected ? (stations as Record<string, string>)[selected] : undefined;

    useEffect(() => {
        setFavorites(getFavorites());
    }, []);

    useEffect(() => {
        if (stationName) {
            const starred = favorites.some(f => f.name === stationName && f.type === 'train');
            setIsStarred(starred);
        } else {
            setIsStarred(false);
        }
    }, [favorites, stationName]);

    const toggleFavorite = () => {
        if (!stationName || !selected) return;

        const newFavorites = [...favorites];
        const favoriteIndex = newFavorites.findIndex(f => f.name === stationName && f.type === 'train');

        if (favoriteIndex !== -1) {
            newFavorites.splice(favoriteIndex, 1);
            setIsStarred(false);
        } else {
            newFavorites.push({ name: stationName, id: selected, type: 'train', createdAt: new Date().toISOString(), lat: 0, lon: 0 });
            setIsStarred(true);
        }

        setFavorites(newFavorites);
        saveFavorites(newFavorites);
        router.refresh();
    };

    return (
        <div className="flex items-center justify-center gap-x-2 max-w-4xl w-full mx-auto">
            <Autocomplete className="flex-grow" label="cerca una stazione" size="lg" isVirtualized variant="underlined" allowsCustomValue={true} listboxProps={{
                emptyContent: "nessun risultato."
            }} defaultSelectedKey={selected} autoFocus={selected == null}>
                {Object.entries(stations).map(([id, name]) => (
                    <AutocompleteItem key={id} as={Link} href={`/departures/${id}`}>
                        {name}
                    </AutocompleteItem>
                ))}
            </Autocomplete>
            {selected && stationName && (
                <Button isIconOnly onPress={toggleFavorite} radius="full" variant="bordered" className="border-none">
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
                </Button>
            )}
        </div>
    )
}