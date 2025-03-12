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
    "svg": "RE",
    "className": "dark:invert invert-0"
}, {
    "code": "RV",
    "svg": "RV",
    "className": "dark:invert invert-0"
}, {
    "code": "EC",
    "svg": "EC",
    "className": "dark:invert invert-0"
}, {
    "code": "RJ",
    "svg": "RJ",
    "className": "dark:invert invert-0"
}]