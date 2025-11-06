import stations from "@/stations.json";

export const clients: Record<number, string> = {
    0: "trenitalia",
    1: "trenitalia",
    2: "trenitalia",
    3: "trenitalia",
    4: "trenitalia",
    18: "trenitalia",
    63: "trenord",
    64: "trenitalia", // 64: "bahn"
};

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const getItalyDateTime = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Rome",
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(new Date());

    const partsMap = new Map(parts.map(p => [p.type, p.value]));

    const hour = parseInt(partsMap.get('hour') || '0');

    return {
        year: parseInt(partsMap.get('year') || '0'),
        month: parseInt(partsMap.get('month') || '0'),
        day: parseInt(partsMap.get('day') || '0'),
        hour: hour === 24 ? 0 : hour,
        minute: parseInt(partsMap.get('minute') || '0'),
    };
};

export const getDelayColor = (delay: number | null) => {
    if (delay === null) return 'gray';
    if (delay >= 10) return 'danger';
    if (delay >= 3) return 'warning';
    if (delay >= 0) return 'success';
    return 'secondary';
};

export const formatDuration = (duration: number, verbose: boolean = false) => {
    const durationInMinutes = Math.round(duration);
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    const absoluteMinutes = Math.abs(minutes);

    if (verbose) {
        if (hours > 0) {
            return `${hours} ${hours === 1 ? 'ora' : 'ore'}${minutes !== 0 ? ` e ${absoluteMinutes} ${absoluteMinutes === 1 ? 'minuto' : 'minuti'}` : ''}`;
        } else {
            return `${absoluteMinutes} ${absoluteMinutes === 1 ? 'minuto' : 'minuti'}`;
        }
    } else {
        return hours > 0 ? `${hours}h ${absoluteMinutes !== 0 ? absoluteMinutes + "min" : ""}` : `${absoluteMinutes}min`;
    }
};

export const capitalize = (str: string) => {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()).replace(/([-.])\s*(\w)/g, (_, symbol, char) => `${symbol} ${char.toUpperCase()}`);
};

export function findMatchingStation(stationName: string): string | null {
    if (!stationName || stationName.trim() === '') {
        return null;
    }

    const normalize = (s: string) => s.replace(/\s*[-.]\s*/g, match => match.trim()).replace(/\b\/Av\b/gi, "").trim();
    const normalizedInput = normalize(stationName);

    for (const [id, name] of Object.entries(stations)) {
        if (normalizedInput === normalize(name)) {
            return id;
        }
    }

    return null;
}

export function generateDeviceId(): string {
    return 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getOrCreateDeviceId(): string {
    const STORAGE_KEY = 'device_id'

    let deviceId = localStorage.getItem(STORAGE_KEY)

    if (!deviceId) {
        deviceId = generateDeviceId()
        localStorage.setItem(STORAGE_KEY, deviceId)
        sessionStorage.setItem(STORAGE_KEY, deviceId)

        console.log('Created new device ID:', deviceId)
    }

    return deviceId
}

export function detectDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
        if (/iPad/.test(userAgent)) return 'tablet'
        return 'mobile'
    }
    return 'desktop'
}

export function detectPlatform(userAgent: string): string {
    if (/iPhone|iPad/.test(userAgent)) return 'ios'
    if (/Android/.test(userAgent)) return 'android'
    if (/Windows/.test(userAgent)) return 'windows'
    if (/Mac/.test(userAgent)) return 'macos'
    return 'unknown'
}

export function encodeKey(buffer: ArrayBuffer | null): string {
    if (!buffer) return ''
    return Buffer.from(new Uint8Array(buffer)).toString('base64')
}

export const formatDate = (date: string) => {
    return new Date(date).toLocaleTimeString('it-IT', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });
};