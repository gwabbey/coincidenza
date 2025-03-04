'use client'

import toast from "react-hot-toast";

export function getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
                },
                (error) => {
                    let message = 'Errore sconosciuto';
                    if (error.code === error.PERMISSION_DENIED) message = 'Accesso negato alla posizione';
                    else if (error.code === error.POSITION_UNAVAILABLE) message = 'Posizione non disponibile';
                    else if (error.code === error.TIMEOUT) message = 'Timeout durante la richiesta';

                    toast.error(message);
                },
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else reject(new Error('Geolocation not supported'));
    });
}