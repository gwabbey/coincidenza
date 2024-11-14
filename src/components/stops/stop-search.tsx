'use client'

import { ActionIcon, Select } from '@mantine/core'
import { IconGps } from '@tabler/icons-react'
import { Stop } from '@/types'

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
            rightSection={
                <ActionIcon
                    variant="transparent"
                    size="xl"
                    aria-label="La mia posizione"
                    onClick={onLocationRequest}
                >
                    <IconGps stroke={1} size={36} />
                </ActionIcon>
            }
            value={value}
            radius="xl"
            nothingFoundMessage="Nessuna fermata trovata"
        />
    )
} 