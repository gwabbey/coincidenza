export interface Alert {
    description: string
    url: string
}

export interface Realtime {
    delay: number
    destination: string
    alerts: Alert[]
}