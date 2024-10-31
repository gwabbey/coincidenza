'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Badge, Box, Center, Loader, Select, Title} from '@mantine/core';
import {setCookie} from '@/api';
import {Stop} from '@/types';

export default function Stops({stops}: { stops: Stop[] }) {
    const router = useRouter();
    const currentParams = useSearchParams();
    const [value, setValue] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const stopMap = useMemo(() => {
        return stops.reduce((acc, stop) => {
            acc[stop.stopId] = stop;
            return acc;
        }, {} as Record<string, Stop>);
    }, [stops]);

    const stopOptions = useMemo(() => {
        return stops.map((stop) => ({
            value: `${stop.stopId}-${stop.type}`,
            label: `${stop.stopName} (${stop.stopCode})`,
            stop: stop,
        }));
    }, [stops]);

    useEffect(() => {
        const id = currentParams.get('id');
        const type = currentParams.get('type');

        if (id && type) {
            const matchedStop = stopMap[id];
            if (matchedStop && matchedStop.type === type) {
                setValue(`${matchedStop.stopId}-${matchedStop.type}`);
                setSelectedStop(matchedStop);
            } else {
                setValue(null);
                setSelectedStop(null);
            }
        }
        setLoading(false);
    }, [currentParams, stopMap]);

    const handleStopChange = useCallback(async (selectedValue: string | null) => {
        if (!selectedValue) return;

        setLoading(true);
        setValue(selectedValue);

        const option = stopOptions.find(opt => opt.value === selectedValue);
        if (option) {
            const stop = option.stop;
            setSelectedStop(stop);

            try {
                await Promise.all([
                    setCookie('id', stop.stopId),
                    setCookie('type', stop.type)
                ]);
                router.push(`/stops?id=${stop.stopId}&type=${stop.type}`);
            } catch (error) {
                console.error('Error updating stop:', error);
            }
        }
        setLoading(false);
    }, [stopOptions, router]);

    return (
        <Box maw={750} w="100%" mx="auto" mt="xl">
            <Select
                data={stopOptions}
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
                onSearchChange={setSearchQuery}
                searchValue={searchQuery}
            />

            {loading && (
                <Center mt="md">
                    <Loader />
                </Center>
            )}

            {selectedStop && (
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