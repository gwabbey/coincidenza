'use client'

export function getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({lat: position.coords.latitude, lon: position.coords.longitude});
                },
                {enableHighAccuracy: true, maximumAge: 0}
            );
        } else reject(new Error('Geolocation not supported'));
    });
}