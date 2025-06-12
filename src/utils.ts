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


export function getTrackUrl(company: string, trainNumber: string): string | null {
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
        return `/track/trenitalia/${trainNumber}`;
    }

    switch (normalizedCompany) {
        case "trenitalia":
        case "trenord":
        case "trenitalia tper":
        case "sad":
        case "sta":
            return `/track/trenitalia/${trainNumber}`;
        case "italo":
            return null;
        case "öbb":
            return null;
        default:
            return `/track/trenitalia/${trainNumber}`;
    }
}