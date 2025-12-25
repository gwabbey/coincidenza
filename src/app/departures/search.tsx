"use client";

import {type Location, searchLocation} from "@/api/motis/geocoding";
import {
    Autocomplete,
    AutocompleteItem,
    Button,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
    Input,
    Modal,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Spinner,
    useDisclosure
} from "@heroui/react";
import {JSX, useEffect, useState} from "react";
import {useDebouncedCallback} from 'use-debounce';
import stations from "@/stations.json";
import agencies from "@/agencies.json";
import Link from "next/link";
import Image from "next/image";
import {
    IconBriefcase2,
    IconBurger,
    IconBus,
    IconChevronDown,
    IconHeart,
    IconHome,
    IconStar,
    IconStarFilled,
    IconTrain,
    IconTrees
} from "@tabler/icons-react";
import {Favorite} from "@/types";
import {useRouter} from "next/navigation";

const icons: Record<string, JSX.Element> = {
    bus: <IconBus />,
    train: <IconTrain />,
    home: <IconHome />,
    work: <IconBriefcase2 />,
    food: <IconBurger />,
    park: <IconTrees />,
    love: <IconHeart />
}

export default function Search({selected, selectedName}: { selected?: string, selectedName?: string }) {
    const router = useRouter();
    const [data, setData] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(selectedName || "");
    const rfiStations = stations as Record<string, string>;

    const {isOpen, onOpen, onClose} = useDisclosure();
    const [name, setName] = useState(selectedName ?? "");
    const [type, setType] = useState("bus");

    const [savedFavorites, setSavedFavorites] = useState<Favorite[]>([]);

    useEffect(() => {
        try {
            const cookie = decodeURIComponent(document.cookie
                .split("; ")
                .find(row => row.startsWith("favorites="))?.split("=")[1] || "[]");
            setSavedFavorites(JSON.parse(cookie));
        } catch {
            setSavedFavorites([]);
        }
    }, []);

    const isFavorite = selected ? savedFavorites.some(f => f.id === selected) : false;

    function addFavorite() {
        if (!name || !type) return;

        if (selected) {
            const newFavorite: Favorite = {
                id: selected, name, type, createdAt: new Date().toISOString()
            };
            savedFavorites.push(newFavorite);
            document.cookie = `favorites=${encodeURIComponent(JSON.stringify(savedFavorites))}; path=/; max-age=${60 * 60 * 24 * 365}`;
        }
        onClose();
    }

    const getRfiStations = (query: string) => {
        const q = query.toLowerCase().trim();
        if (q.length < 3) return [];

        return Object.entries(rfiStations)
            .filter(([, name]) => name.toLowerCase().includes(q))
            .map(([id, name]) => ({
                id: `rfi_${id}`, name, address: "Stazione dei treni", lat: 0, lon: 0
            }));
    };

    const fetchData = useDebouncedCallback(async (query: string) => {
        if (!query || query.trim().length < 3) {
            return;
        }

        setLoading(true);

        try {
            const search = await searchLocation(query);
            const rfi = getRfiStations(query);
            setData([...rfi, ...search]);
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log("Request aborted");
                return;
            }
            console.error("Error fetching location data:", error);
        } finally {
            setLoading(false);
        }
    }, 500);

    useEffect(() => {
        if (selected && selectedName) {
            const selectedStop: Location = {
                id: selected, name: selectedName, address: "", lat: 0, lon: 0
            };
            setData([selectedStop]);

            if (selectedName.length >= 3) {
                fetchData(selectedName);
            }
        }
    }, [selected, selectedName]);

    const getAgencyIcon = (id: string) => {
        const prefix = id.split("_")[0];
        const agency = agencies.find(a => a.id === prefix);

        return agency ?
            <Image height={32} width={32} src={agency.icon} alt={agency.name} className="w-8 h-8 object-contain" /> :
            <span className="flex w-8 h-8 text-center items-center justify-center">{prefix}</span>
    };

    return (<div className="flex items-center justify-center gap-x-2 max-w-4xl w-full mx-auto">
        <Autocomplete
            label="Cerca..."
            defaultSelectedKey={selected}
            inputValue={inputValue}
            onInputChange={(value) => {
                setInputValue(value);
                fetchData(value);
            }}
            fullWidth
            variant="underlined"
            classNames={{
                selectorButton: "hidden", endContentWrapper: "mr-1"
            }}
            endContent={loading && <Spinner size="sm" color="default" />}
            items={data}
            size="lg"
            autoFocus={selected == null}
            allowsCustomValue={true}
        >
            {(item: Location) => (<AutocompleteItem
                as={Link}
                href={`/departures/${item.id}`}
                startContent={getAgencyIcon(item.id)}
                key={item.id}
            >
                <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.address && <span className="text-sm text-default-400">{item.address}</span>}
                </div>
            </AutocompleteItem>)}
        </Autocomplete>

        {selected && (<div className="flex gap-0">
            <Button
                isIconOnly
                startContent={isFavorite ? <IconStarFilled /> : <IconStar />}
                onPress={isFavorite ? () => {
                    const newFavorites = savedFavorites.filter(f => f.id !== savedFavorites.find(f => f.id === selected)?.id);
                    document.cookie = `favorites=${encodeURIComponent(JSON.stringify(newFavorites))}; path=/; max-age=${60 * 60 * 24 * 365}`;
                    router.refresh();
                } : onOpen}
                color="warning"
                radius="full"
                variant="light"
                className="border-none"
            />
        </div>)}

        <Modal isOpen={isOpen} onOpenChange={onClose} backdrop="blur" placement="center">
            <ModalContent>
                <ModalHeader>
                    <h1>Salva preferito</h1>
                </ModalHeader>
                <div className="flex flex-row gap-x-1 px-6">
                    <Dropdown placement="bottom" classNames={{content: "min-w-auto"}}>
                        <DropdownTrigger>
                            <Button
                                endContent={<IconChevronDown className="text-default-400 shrink-0 -mr-2" size={16} />}
                                startContent={icons[type] ?? icons.default}
                                variant="flat"
                                className="border-none rounded-r-none"
                            />
                        </DropdownTrigger>
                        <DropdownMenu variant="flat" key="icons">
                            {Object.entries(icons).map(([name, icon]) => (<DropdownItem
                                key={name}
                                startContent={icon}
                                className="p-2 gap-0"
                                onPress={() => setType(name)}
                            />))}
                        </DropdownMenu>
                    </Dropdown>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome"
                        classNames={{inputWrapper: "rounded-l-none"}}
                    />
                </div>
                <ModalFooter className="flex justify-end gap-2">
                    <Button isDisabled={name.length === 0} onPress={addFavorite}>Salva</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    </div>);
}