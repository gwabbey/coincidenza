export const trainCategoryShortNames = {
    "regionale": "R",
    "regionale veloce": "RV",
    "regio express": "RE",
    "frecciarossa": "FR",
    "frecciabianca": "FB",
    "eurocity": "EC",
    "railjet": "RJ",
    "intercity": "IC",
    "italo": "AV",
    "intercity notte": "ICN",
    "malpensa express": "MXP",
    "metropolitano": "M",
    "espresso": "E",
    "eurostar italia": "ES*",
    "autocorsa": "bus",
    "treno storico": "TS",
    "interregionale": "iR",
}

export function getTrainCategory(input: string) {
    if (input.includes("AV")) {
        return "alta velocità";
    }
    return (
        trainCategoryShortNames[input as keyof typeof trainCategoryShortNames] ||
        (Object.entries(trainCategoryShortNames).find(([_, v]) => v === input)?.[0] ?? null)
    );
}

export const trainCodeLogos = [{
    "code": "R",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/RE.svg",
}, {
    "code": "RV",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/RV.svg",
}, {
    "code": "EC",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/EC.svg",
}, {
    "code": "RJ",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/EC.svg",
}, {
    "code": "IC",
    "url": "https://upload.wikimedia.org/wikipedia/commons/8/86/Treno_Intercity.svg",
}, {
    "code": "EXP",
    "url": "https://upload.wikimedia.org/wikipedia/commons/c/ce/Simbolo_Treno_Espresso.svg",
}]