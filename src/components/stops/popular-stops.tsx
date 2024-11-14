'use client'

import { Button, Flex, Stack, Title } from '@mantine/core'

interface PopularStop {
    id: number
    name: string
    type: string
}

const popularStops: PopularStop[] = [
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
    return (
        <Stack
            align="center"
            justify="flex-start"
            gap="md"
            mt="xl"
        >
            <Title order={3}>Fermate popolari</Title>
            <Flex
                gap="xl"
                justify="center"
                align="center"
                direction="row"
                wrap="wrap"
            >
                {popularStops.map((stop) => (
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