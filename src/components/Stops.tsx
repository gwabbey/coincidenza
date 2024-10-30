'use client';
import {Box, Center, Loader, Select} from "@mantine/core";
import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {setCookie} from "@/api";

export default function Stops({stops}: { stops: any[] }) {
    const router = useRouter();
    const currentParams = useSearchParams();
    const [value, setValue] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const stopMap = stops.reduce((acc, stop) => {
        acc[stop.stopId] = stop;
        return acc;
    }, {});

    useEffect(() => {
        const id = currentParams.get('id');
        const type = currentParams.get('type');

        if (id && type) {
            const matchedStop = stopMap[id];

            if (matchedStop && matchedStop.type === type) {
                setValue(`${matchedStop.stopName} (${matchedStop.stopCode})`);
                setSelectedStop(matchedStop);
            } else {
                setValue(null);
                setSelectedStop(null);
            }
        }

        setLoading(false);
    }, [currentParams, stopMap]);

    const handleStopChange = async (selectedValue: string | null) => {
        setLoading(true);
        setValue(selectedValue);
        const selectedStop = stops.find(
            stop => `${stop.stopName} (${stop.stopCode})` === selectedValue
        ) || null;

        if (selectedStop) {
            setSelectedStop(selectedStop);
            await setCookie('id', selectedStop.stopId);
            await setCookie('type', selectedStop.type);
            router.push(`/stops?id=${selectedStop.stopId}&type=${selectedStop.type}`);
        }
        setLoading(false);
    };

    return (
        <Box maw={750} w="100%" mx="auto" mt="xl">
            <Select
                data={stops.map((stop) => `${stop.stopName} (${stop.stopCode})`)}
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

            {loading ? (
                <Center mt="md">
                    <Loader />
                </Center>
            ) : selectedStop && (
                <Box ta="center">
                    <h1>{selectedStop.stopName} {selectedStop.town && `(${selectedStop.town})`}</h1>
                    <div>a {selectedStop.distance > 1 ? `${selectedStop.distance.toFixed(2)} km` : `${(selectedStop.distance * 1000).toFixed(0)} m`} da
                        te
                    </div>
                </Box>
            )}
        </Box>
    );
}