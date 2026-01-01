import Directions from "@/app/directions/directions";
import {Metadata} from 'next';

export const metadata: Metadata = {
    title: "calcola percorso | coincidenza",
    description: "scopri come arrivare da un luogo all\' altro con i mezzi pubblici"
};

export default async function Page() {
    // const cookieStore = await cookies();
    // const recentRaw = cookieStore.get('recent')?.value ?? '{}';
    // const recent = JSON.parse(decodeURIComponent(recentRaw));

    return <Directions />;
}