'use client';
import {useCallback, useEffect, useState} from "react";
import {Autocomplete, ComboboxItem, Loader, OptionsFilter} from "@mantine/core";
import {useDebouncedValue} from "@mantine/hooks";
import {searchLocation} from "@/api";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

interface Props {
    name: string;
    selected?: string;
    placeholder: string;
    debounceDelay?: number;
}

export const LocationInput = ({
                                  name,
                                  selected = "",
                                  placeholder,
                                  debounceDelay = 200,
                              }: Props) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = useState(selected);
    const [debouncedValue] = useDebouncedValue(value, debounceDelay);
    const [data, setData] = useState<{ value: string; label: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const result = await searchLocation(query);
            const locations = result.features.filter((location: {
                properties: { name: any; city: any; county: any; countrycode: any; };
            }, index: any, self: any[]) => {
                return index === self.findIndex((t) => (
                    t.properties.name === location.properties.name &&
                    t.properties.city === location.properties.city &&
                    t.properties.county === location.properties.county &&
                    t.properties.countrycode === location.properties.countrycode
                ));
            }).map((location: any) => ({
                value: JSON.stringify(location),
                label: [
                    location.properties.name,
                    location.properties.city,
                    location.properties.county,
                    location.properties.countrycode,
                ]
                    .filter(Boolean)
                    .join(", "),
            }));
            setData(locations);
        } catch (error) {
            console.error("Error fetching location data:", error);
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

    function onLocationSelect(location: any) {
        const locationString = `${location.geometry.coordinates[1]},${location.geometry.coordinates[0]}`;
        const current = new URLSearchParams(searchParams);
        current.set(name, locationString);

        const search = current.toString();
        const query = search ? `?${search}` : "";

        router.push(`${pathname}${query}`);
    }

    return (
        <Autocomplete
            value={value}
            data={data}
            onChange={setValue}
            onOptionSubmit={(value) => onLocationSelect(JSON.parse(value))}
            rightSection={loading && <Loader size="xs" />}
            placeholder={placeholder}
            size="xl"
            comboboxProps={{transitionProps: {transition: "fade-up", duration: 200}}}
            filter={optionsFilter}
            radius="xl"
        />
    );
};