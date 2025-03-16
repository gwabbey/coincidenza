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
    "className": "invert h-4"
}, {
    "code": "RV",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/RV.svg",
    "className": "invert h-4"
}, {
    "code": "EC",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/EC.svg",
    "className": "invert h-4"
}, {
    "code": "RJ",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/EC.svg",
    "className": "invert h-4"
}, {
    "code": "IC",
    "url": "https://upload.wikimedia.org/wikipedia/commons/8/86/Treno_Intercity.svg",
    "className": "invert h-4"
}, {
    "code": "ICN",
    "url": "data:image/gif;base64,R0lGODlhRAArAIcAAAAAAACK2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFAgAAACwAAAAARAArAAAI/wABCBxIsKDBgwgTKlxIMEAAhgodSnwIsWLCiRYFTty4MWNGjhU5iuzokSHIhSNTkiyJcOVFlTAdsnwpM2JKgypn6hxpUqTOkjxDuvwJ8eRHiUSPYpxJsSfSlk8LGk0KNWjDqFexUpUak2vNrFq3aoz5FcBSsE3FDiR79uxat2rNDvUpt+zYsFunvl0Kd6hav3tr9oX7lzDaumkRJy5sFyfGwXjzRg78EHJjyZPvyrS8GPPlw5zjUkb5WCtgqqdHE079k7VixI4z7zQMOqxrprRV470NNLfmyrt5K/2s+7Nwi65560XeWTTa5jaJO7fqVHZc6lWPe16u2Lfz32y1ixQOz/07zfDmccNMj9o6+/fw41sMCAA7",
    "className": "h-4"
}, {
    "code": "FR",
    "url": "https://www.lefrecce.it/Channels.Website.WEB/web/images/logo/FR.svg",
    "className": "h-4"
}, {
    "code": "EXP",
    "url": "https://upload.wikimedia.org/wikipedia/commons/c/ce/Simbolo_Treno_Espresso.svg",
    "className": "h-4"
}]