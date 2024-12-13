'use client';
import { Autocomplete, Box } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import stations from './stations.json';

interface Props {
    selected?: string;
    placeholder: string;
    debounceDelay?: number;
    disabled?: boolean;
}

export const TrainStationInput = ({
    selected = "",
    placeholder,
    debounceDelay = 200,
    disabled = false,
}: Props) => {
    const router = useRouter();
    const [value, setValue] = useState(selected);
    const [debouncedValue] = useDebouncedValue(value, debounceDelay);
    const [data, setData] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        if (!debouncedValue) {
            setData([]);
            return;
        }
        const filteredStations = Object.entries(stations as Record<string, string>)
            .filter(([_, name]) => name.toLowerCase().includes(debouncedValue.toLowerCase()))
            .map(([id, name]) => ({ value: id, label: name }));
        setData(filteredStations);
    }, [debouncedValue]);

    const onStationSelect = (value: string) => {
        router.push(`/trains/${value}`);
        router.refresh();
    };

    return (
        <Box maw={750} w="100%" mx="auto" ta="left">
            <Autocomplete
                value={value}
                data={data}
                onChange={setValue}
                onOptionSubmit={onStationSelect}
                placeholder={placeholder}
                size="xl"
                disabled={disabled}
                comboboxProps={{
                    transitionProps: { transition: "fade-up", duration: 200 },
                }}
                radius="xl"
                limit={30}
            />
        </Box>
    );
};