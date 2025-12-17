'use client'

export function getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(pos => resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        }), err => reject(err), {enableHighAccuracy: true, maximumAge: 0});
    });
}