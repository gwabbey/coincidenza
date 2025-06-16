"use client";

import stations from "@/stations.json";
import { Autocomplete, AutocompleteItem } from "@heroui/react";
import Link from "next/link";

export default function Search({ selected }: { selected?: string }) {
    return (
        <Autocomplete className="max-w-4xl mx-auto" label="cerca una stazione" size="lg" isClearable={false} isVirtualized variant="underlined" allowsCustomValue={true} listboxProps={{
            emptyContent: "nessun risultato."
        }} defaultSelectedKey={selected} autoFocus={selected == null}>
            {Object.entries(stations).map(([id, name]) => (
                <AutocompleteItem key={id} as={Link} href={`/departures/${id}`}>
                    {name}
                </AutocompleteItem>
            ))}
        </Autocomplete>
    )
}