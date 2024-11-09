'use client';
import {useCallback, useEffect, useState} from "react";
import {Autocomplete, ComboboxItem, Loader, OptionsFilter} from "@mantine/core";
import {useDebouncedValue} from "@mantine/hooks";
import {useRouter} from 'next/navigation';
import stations from "./stations.json";

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
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const filteredStations = Object.entries(stations).filter(([name]) =>
                name.toLowerCase().includes(query.toLowerCase())
            );
            const stationList = filteredStations.map(([id, name]) => ({
                value: id,
                label: name,
            }));
            setData(stationList);
        } catch (error) {
            console.error("Error fetching station data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!debouncedValue) {
            setData([]);
            return;
        }
        fetchData(debouncedValue);
    }, [debouncedValue, fetchData]);

    const optionsFilter: OptionsFilter = ({options, search}) => {
        const splitSearch = search.toLowerCase().trim().split(" ");
        return (options as ComboboxItem[]).filter((option) => {
            const words = option.label.toLowerCase().trim().split(" ");
            return splitSearch.every((searchWord) =>
                words.some((word) => word.includes(searchWord))
            );
        });
    };

    const onStationSelect = useCallback(async (value: string) => {
        router.push(`/trains/departures/${value}`);
    }, [router]);

    return (
        <Autocomplete
            value={value}
            data={data}
            onChange={setValue}
            onOptionSubmit={onStationSelect}
            rightSection={loading && <Loader size="xs" />}
            placeholder={placeholder}
            size="xl"
            disabled={disabled}
            comboboxProps={{
                transitionProps: {transition: "fade-up", duration: 200},
            }}
            filter={optionsFilter}
            radius="xl"
        />
    );
};