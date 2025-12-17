import {cookies} from "next/headers";
import Directions from "@/app/directions/directions";

export default async function Page() {
    const cookieStore = await cookies();
    const searchRaw = cookieStore.get('q')?.value ?? '{}';
    const search = JSON.parse(decodeURIComponent(searchRaw));

    if (cookieStore) return <Directions search={search} />;
}