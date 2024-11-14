'use client'

import { Badge, Container, Title } from '@mantine/core'
import { Stop } from '@/types'

interface StopInfoProps {
    stop: Stop
    userLocation: boolean
}

export function StopInfo({ stop, userLocation }: StopInfoProps) {
    return (
        <Container mt="sm" ta="center">
            <Title order={1}>
                {stop.stopName}
                {stop.town && ` (${stop.town})`}
            </Title>
            <Badge
                size="xl"
                color={stop.type === 'E' ? 'blue' : 'green'}
            >
                {stop.type === 'E' ? 'fermata extraurbana' : 'fermata urbana'}
            </Badge>
            {userLocation && (
                <div>
                    a {stop.distance > 1
                        ? `${stop.distance.toFixed(2)} km`
                        : `${(stop.distance * 1000).toFixed(0)} m`}{' '}
                    da te
                </div>
            )}
        </Container>
    )
} 