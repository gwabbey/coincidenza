import {cookies} from "next/headers";
import Directions from "@/app/directions/directions";

export default async function Page() {
    const cookieStore = await cookies();
    const recentRaw = cookieStore.get('recent')?.value ?? '{}';
    const recent = JSON.parse(decodeURIComponent(recentRaw));

    if (cookieStore) return <Directions recent={recent} />;
}