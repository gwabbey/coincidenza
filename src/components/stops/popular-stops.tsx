'use client'

import { Button, Flex, Stack, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { getCookie } from '@/api'

interface PopularStop {
    id: number
    name: string
    type: string
}

const defaultStops: PopularStop[] = [
    { id: 1, name: 'Stazione di Trento', type: 'E' },
    { id: 1127, name: 'Stazione di Rovereto', type: 'E' },
    { id: 1146, name: 'Autostazione Riva del Garda', type: 'E' },
    { id: 247, name: 'Piazza Dante', type: 'U' },
    { id: 1284, name: 'Corso Rosmini Posta', type: 'U' },
]

interface PopularStopsProps {
    onStopSelect: (value: string) => void
}

export function PopularStops({ onStopSelect }: PopularStopsProps) {
    const [recentStops, setRecentStops] = useState<PopularStop[]>([])

    useEffect(() => {
        const loadRecentStops = async () => {
            const recentStopsCookie = await getCookie('recentStops')
            if (recentStopsCookie?.value) {
                setRecentStops(JSON.parse(recentStopsCookie.value))
            }
        }
        loadRecentStops()
    }, [])

    const displayStops = recentStops.length > 0 ? recentStops : defaultStops

    return (
        <Stack
            align="center"
            justify="flex-start"
            gap="md"
            mt="xl"
        >
            <Title order={3}>
                {recentStops.length > 0 ? 'Fermate recenti' : 'Fermate popolari'}
            </Title>
            <Flex
                gap="xl"
                justify="center"
                align="center"
                direction="row"
                wrap="wrap"
            >
                {displayStops.map((stop) => (
                    <Button
                        key={stop.id}
                        variant="outline"
                        radius="xl"
                        size="md"
                        color={stop.type === 'U' ? 'green' : 'blue'}
                        onClick={() => onStopSelect(`${stop.id}-${stop.type}`)}
                    >
                        {stop.name}
                    </Button>
                ))}
            </Flex>
        </Stack>
    )
} 