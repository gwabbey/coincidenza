export interface Coordinates {
    lat: number;
    lon: number;
}

export interface Location {
    value: string;
    label: string | JSX.Element;
    textValue?: string;
    address?: string;
    coordinates: Coordinates;
    isTrainStation?: boolean;
}

export interface Favorite {
    lat: number;
    lon: number;
    name: string;
    type: string;
    createdAt: string;
    id?: string;
}