'use client'
import {Key} from "react";

export default function Stop({stop}: { stop: any }) {
    return (
        <div>
            {stop.routes.map((route: {
                routeId: Key;
                type: string;
                routeShortName: string;
                routeLongName: string;
            }) => (
                <div key={route.routeId}>
                    <div>
                        {route.routeShortName}
                    </div>
                    <div>
                        {route.routeLongName}
                    </div>
                </div>
            ))}
        </div>
    );
}