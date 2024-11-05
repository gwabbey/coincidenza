'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Badge, Box, Center, Loader, Select, Title} from '@mantine/core';
import {setCookie} from '@/api';
import {Stop} from '@/types';

export default function Stops({stops, id, type}: { stops: Stop[], id?: string, type?: string }) {
    const router = useRouter();
    const [value, setValue] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [loading, setLoading] = useState(true);

    const selectOptions = useMemo(() => {
        return stops.map((stop) => ({
            value: `${stop.stopId}-${stop.type}`,
            label: `${stop.stopName} (${stop.stopCode})`
        }));
    }, [stops]);

    const stopMap = useMemo(() => {
        return stops.reduce((acc, stop) => {
            acc[`${stop.stopId}-${stop.type}`] = stop;
            return acc;
        }, {} as Record<string, Stop>);
    }, [stops]);

    useEffect(() => {
        const fetchStop = async () => {
            setLoading(true);
            if (id && type) {
                const key = `${id}-${type}`;
                const matchedStop = stopMap[key];
                if (matchedStop) {
                    setValue(key);
                    setSelectedStop(matchedStop);
                } else {
                    setValue(null);
                    setSelectedStop(null);
                }
            }
            setLoading(false);
        };
        fetchStop();
    }, [stopMap, id, type]);

    const handleStopChange = useCallback(async (selectedValue: string | null) => {
        if (!selectedValue) return;

        setLoading(true);
        setValue(selectedValue);

        const stop = stopMap[selectedValue];
        if (stop) {
            setSelectedStop(stop);
            try {
                await Promise.all([
                    setCookie('id', stop.stopId),
                    setCookie('type', stop.type)
                ]);
                router.refresh();
            } catch (error) {
                console.error('Error updating stop:', error);
            }
        }
        setLoading(false);
    }, [stopMap, router]);

    return (
        <Box maw={750} w="100%" mx="auto" mt="xl">
            <Select
                data={selectOptions}
                searchable
                placeholder="Cerca una fermata per nome o codice"
                label="Fermata"
                limit={30}
                size="xl"
                allowDeselect={false}
                onChange={handleStopChange}
                value={value}
                radius="xl"
                nothingFoundMessage="Nessuna fermata trovata"
            />

            {loading && (
                <Center mt="md">
                    <Loader />
                </Center>
            )}

            {selectedStop && !loading && (
                <div style={{textAlign: 'center', marginTop: '16px'}}>
                    <Title order={1}>
                        {selectedStop.stopName}
                        {selectedStop.town && ` (${selectedStop.town})`}
                    </Title>
                    <Badge
                        size="xl"
                        color={selectedStop.type === 'E' ? 'blue' : 'green'}
                    >
                        {selectedStop.type === 'E' ? 'fermata extraurbana' : 'fermata urbana'}
                    </Badge>
                    <div>
                        a {selectedStop.distance > 1
                        ? `${selectedStop.distance.toFixed(2)} km`
                        : `${(selectedStop.distance * 1000).toFixed(0)} m`} da te
                    </div>
                </div>
            )}
        </Box>
    );
}