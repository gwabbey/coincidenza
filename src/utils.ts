import stations from "@/stations.json";

export const getDelayColor = (delay: number | null) => {
    if (delay === null) return 'gray';
    if (delay >= 10) return 'danger';
    if (delay >= 5) return 'warning';
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

export function getTrackUrl(company: string, trainInfo: string): string | null {
    const normalizedCompany = company.toLowerCase().trim();

    if (
        normalizedCompany === "frecciarossa" ||
        normalizedCompany === "frecciargento" ||
        normalizedCompany === "frecciabianca" ||
        normalizedCompany === "intercity" ||
        normalizedCompany === "intercity notte" ||
        normalizedCompany === "treno storico" ||
        normalizedCompany === "espresso"
    ) {
        return `/track/trenitalia/${trainInfo}`;
    }

    switch (normalizedCompany) {
        case "trenitalia":
        case "trenord":
        case "trenitalia tper":
        case "sad":
        case "sta":
            return `/track/trenitalia/${trainInfo}`;
        case "italo":
            return null;
        case "öbb":
            return null;
        default:
            return `/track/trenitalia/${trainInfo}`;
    }
}

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