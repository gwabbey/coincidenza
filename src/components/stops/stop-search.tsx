'use client'

import { getCookie, setCookie } from '@/api'
import { Stop } from '@/types'
import { ActionIcon, Box, Select, Stack, Text } from '@mantine/core'
import { IconGps } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { getUserLocation } from '../geolocation'

export function StopSearch({ stops }: { stops: Stop[] }) {
    const router = useRouter();
    const selectOptions = stops.map((stop) => ({
        value: `${stop.stopId}-${stop.type}`,
        label: `${stop.stopName} (${stop.stopCode})`,
        routes: stop.routes.map((route) => route.routeShortName).join(', '),
        type: stop.type
    }));

    const getClosestStops = useCallback(async () => {
        const userLocation = await getUserLocation();
        await setCookie('lat', userLocation.lat);
        await setCookie('lon', userLocation.lon);
        router.refresh();
    }, [router]);

    return (
        <Select
            data={selectOptions}
            searchable
            placeholder="Cerca una fermata per nome o codice"
            limit={30}
            size="xl"
            my="sm"
            allowDeselect={false}
            onChange={async (value) => {
                if (value) {
                    const [id, type] = value.split('-');
                    if (id && type) {
                        const newStop = { id, name: selectOptions.find((option) => option.value === value)?.label, type: type };
                        const recentStops = await getCookie('recentStops');
                        const updatedStops = [newStop, ...JSON.parse(recentStops || '[]').filter((s: any) => s.id !== newStop.id).slice(0, 4)];
                        await setCookie('recentStops', JSON.stringify(updatedStops));
                        router.push(`/bus?id=${id}&type=${type}`);
                    }
                }
            }}
            disabled={stops.length === 0}
            rightSectionPointerEvents="all"
            onFocus={getClosestStops}
            rightSection={
                <ActionIcon
                    variant="transparent"
                    size="xl"
                    aria-label="La tua posizione"
                    onClick={getClosestStops}
                >
                    <IconGps stroke={1} size={36} />
                </ActionIcon>
            }
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
            maxDropdownHeight={300}
            comboboxProps={{ transitionProps: { transition: 'fade', duration: 300 } }}
        />
    )
} 