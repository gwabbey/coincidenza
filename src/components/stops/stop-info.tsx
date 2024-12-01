'use client'

import { Stop } from '@/types'
import { Badge, Container, Title } from '@mantine/core'

interface StopInfoProps {
    stop: Stop
    userLocation: boolean
}

export function StopInfo({ stop, userLocation }: StopInfoProps) {
    return (
        <Container mt="sm" ta="center">
            <Title order={2}>
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
                    a {stop.distance && stop.distance > 1
                        ? `${stop.distance.toFixed(2)} km`
                        : `${((stop.distance ? stop.distance : 0) * 1000).toFixed(0)} m`}{' '}
                    da te
                </div>
            )}
        </Container>
    )
} 