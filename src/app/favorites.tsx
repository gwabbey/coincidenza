"use client"

import { Favorite } from "@/types";
import { Button, Card, CardBody, CardHeader, Link } from "@heroui/react";
import { IconBus, IconTrain, IconTrash } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";

export function Favorites({ favorites }: { favorites: Favorite[] }) {
    const router = useRouter();
    if (!favorites) return null;

    function navigateToFavorite(favorite: Favorite) {
        if (favorite.type === "train") {
            router.push(`/departures/${favorite.id ?? ""}`)
        } else {
            document.cookie = `userLat=${favorite.lat}; path=/`;
            document.cookie = `userLon=${favorite.lon}; path=/`;
            router.push(`/bus`);
        }
    }

    function removeFavorite(favorite: Favorite) {
        const cookieString = decodeURIComponent(document.cookie
            .split('; ')
            .find(row => row.startsWith('favorites='))?.split('=')[1] || '[]');

        let favorites: Favorite[] = [];

        try {
            favorites = JSON.parse(cookieString);
        } catch {
            favorites = [];
        }

        const newFavorites = favorites.filter(f =>
            f.id ? f.id !== favorite.id : (Math.abs(f.lat - favorite.lat) > 0.0001 || Math.abs(f.lon - favorite.lon) > 0.0001)
        );

        document.cookie = `favorites=${encodeURIComponent(JSON.stringify(newFavorites))}; path=/; max-age=${60 * 60 * 24 * 365}`;
        router.refresh();
    }

    return (<Card className="p-2 max-w-2xl w-full">
        <CardHeader className="pb-0">
            <p className="text-xl font-bold">preferiti</p>
        </CardHeader>
        <CardBody>
            <AnimatePresence initial={false}>
                {favorites.length ? favorites.slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((favorite: Favorite) => (
                        <motion.div
                            key={`${favorite.name}-${favorite.lat},${favorite.lon}`}
                            transition={{ duration: 0.3 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            layout
                        >
                            <div className="flex justify-between items-center py-2">
                                <Link onPress={() => navigateToFavorite(favorite)} className="cursor-pointer text-default-foreground gap-2">
                                    {favorite.type === "train" ? <IconTrain /> : <IconBus />}
                                    {favorite.name}
                                </Link>
                                <Button
                                    isIconOnly
                                    onPress={() => removeFavorite(favorite)}
                                    startContent={<IconTrash />}
                                    radius="full"
                                    variant="flat"
                                    color="danger"
                                    className="border-none"
                                />
                            </div>
                        </motion.div>
                    )) : (
                    <p className="text-gray-500">aggiungi una posizione nei preferiti per controllare le partenze da qui!</p>
                )}
            </AnimatePresence>
        </CardBody>
    </Card>
    )
}