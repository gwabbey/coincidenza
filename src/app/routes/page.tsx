import {getRoute} from "@/api";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode } from "react";

export default async function Page({searchParams}: {
    searchParams: { type?: string, routeId?: string, limit?: string, directionId?: string }
}) {
    const {type, routeId, limit, directionId} = searchParams;

    if (!type || !routeId || !limit || !directionId) {
        return (
            <div>
                manca qualcosa
            </div>
        )
    }
    const route = await getRoute(type, routeId, limit, directionId, new Date().toISOString());
    console.log(route);
    console.log(route.details);

    return (
        <div>
            <h1>{route.details[0].CodicePubblico}</h1>
            <h1>{route.details[0].Descrizione}</h1>
            {route.trips.map((trip: { tripId: Key | null | undefined; tripHeadsign: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; delay: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; }) => (
                <div key={trip.tripId}>
                    {trip.tripHeadsign} - ritardo di {trip.delay} minuti
                </div>
            ))}
        </div>
    );
}