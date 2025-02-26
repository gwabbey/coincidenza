export interface Alert {
    description: string
    url: string
}

export interface Realtime {
    delay: number | null
    destination: string | null
    alerts: Alert[] | null
}