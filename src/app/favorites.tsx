"use client"

import { Favorite } from "@/types";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { IconTrash } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function Favorites({ favorites }: { favorites: Favorite[] }) {
    const router = useRouter();
    if (!favorites) return null;

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

        const newFavorites = favorites.filter(
            f => Math.abs(f.lat - favorite.lat) > 0.0001 || Math.abs(f.lon - favorite.lon) > 0.0001
        );

        document.cookie = `favorites=${encodeURIComponent(JSON.stringify(newFavorites))}; path=/; max-age=${60 * 60 * 24 * 365}`;
        router.refresh();
        toast.success("Preferito rimosso!");
    }

    return (<Card className="p-2 max-w-2xl w-full">
        <CardHeader className="flex-col items-start">
            <p className="text-xl font-bold">Preferiti</p>
        </CardHeader>
        <CardBody>
            <AnimatePresence mode="wait">
                {favorites.length ? favorites.map((favorite: Favorite) => (
                    <motion.div
                        key={`${favorite.name}-${favorite.lat},${favorite.lon}`}
                        layout
                        exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="flex justify-between items-center">
                            <p>{favorite.name}</p>
                            <Button
                                isIconOnly
                                onPress={() => removeFavorite(favorite)}
                                startContent={<IconTrash />}
                                radius="full"
                                variant="bordered"
                                className="border-none"
                            />
                        </div>
                    </motion.div>
                )) : (
                    <p className="text-gray-500">ancora nessun preferito :(</p>
                )}
            </AnimatePresence>
        </CardBody>
    </Card>
    )
}