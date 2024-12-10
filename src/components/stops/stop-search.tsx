'use client'

import { Stop } from '@/types'
import { ActionIcon, Box, Select, Stack, Text } from '@mantine/core'
import { IconGps } from '@tabler/icons-react'

interface StopSearchProps {
    stops: Stop[]
    value: string | null
    onStopChange: (value: string | null) => void
    onLocationRequest: () => void
}

export function StopSearch({
    stops,
    value,
    onStopChange,
    onLocationRequest
}: StopSearchProps) {
    const selectOptions = stops.map((stop) => ({
        value: `${stop.stopId}-${stop.type}`,
        label: `${stop.stopName} (${stop.stopCode})`,
        routes: stop.routes.map((route) => route.routeShortName).join(', '),
        type: stop.type
    }))

    return (
        <Select
            data={selectOptions}
            searchable
            placeholder="Cerca una fermata per nome o codice"
            limit={30}
            size="xl"
            my="sm"
            allowDeselect={false}
            onChange={onStopChange}
            disabled={stops.length === 0}
            rightSectionPointerEvents="all"
            onFocus={onLocationRequest}
            rightSection={
                <ActionIcon
                    variant="transparent"
                    size="xl"
                    aria-label="La tua posizione"
                    onClick={onLocationRequest}
                >
                    <IconGps stroke={1} size={36} />
                </ActionIcon>
            }
            value={value}
            renderOption={(props) => {
                const option = props.option as typeof selectOptions[number]
                return (
                    <Stack
                        align="start"
                        justify="center"
                        gap={0}
                        pos="relative"
                        pl="sm"
                    >
                        <Box
                            pos="absolute"
                            left={0}
                            h="100%"
                            w="4px"
                            style={{
                                borderRadius: 9999,
                            }}
                            bg={option.type === 'U' ? 'green' : option.type === 'E' ? 'blue' : 'dimmed'}
                        />
                        <Text size="xl">{option.label}</Text>
                        <Text size="sm" c="dimmed">{option.routes}</Text>
                    </Stack>
                )
            }}
            radius="xl"
            nothingFoundMessage="Nessuna fermata trovata"
        />
    )
} 