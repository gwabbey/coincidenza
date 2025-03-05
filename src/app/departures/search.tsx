"use client";

import { Autocomplete, AutocompleteItem } from "@heroui/react";
import Link from "next/link";
import { Key, useState } from "react";
import stations from "./stations.json";

export default function Search({ selected }: { selected?: string }) {
    const [key, setValue] = useState<Key | null>(selected || null);

    return (
        <Autocomplete className="max-w-4xl mx-auto" label="seleziona una stazione" size="lg" isClearable={false} isVirtualized variant="underlined" listboxProps={{
            emptyContent: "nessun risultato."
        }} selectedKey={key?.toString()} onSelectionChange={setValue}>
            {Object.entries(stations).map(([id, name]) => (
                <AutocompleteItem key={id} as={Link} href={`/departures/${id}`}>
                    {name}
                </AutocompleteItem>
            ))}
        </Autocomplete>
    )
}