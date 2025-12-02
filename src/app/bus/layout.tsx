import {Favorite} from "@/types";
import {cookies} from "next/headers";
import {Search} from "./search";

export default async function Layout({
                                         children,
                                     }: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const favoritesRaw = cookieStore.get('favorites')?.value ?? '[]';
    const userLat = cookieStore.get('userLat')?.value;
    const userLon = cookieStore.get('userLon')?.value;

    let favorites: Favorite[] = [];
    try {
        favorites = JSON.parse(decodeURIComponent(favoritesRaw));
    } catch {
    }

    let currentLocationName = '';
    if (userLat && userLon) {
        const lat = parseFloat(userLat);
        const lon = parseFloat(userLon);
        const favorite = favorites.find(f =>
            Math.abs(f.lat - lat) < 0.0001 && Math.abs(f.lon - lon) < 0.0001
        );
        if (favorite) {
            currentLocationName = favorite.name;
        }
    }
    if (cookieStore)
        return (
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
                <h1 className="text-2xl font-bold text-center">Partenze dei bus</h1>
                <Search
                    favorites={favorites}
                    initialLocationName={currentLocationName}
                />
                <div>
                    {children}
                </div>
            </div>
        );
}