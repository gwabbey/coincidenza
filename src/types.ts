export interface Coordinates {
    lat: number;
    lon: number;
}

export interface Favorite {
    lat: number;
    lon: number;
    name: string;
    type: string;
    createdAt: string;
    id?: string;
}