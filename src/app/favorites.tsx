"use client"
import {Favorite} from "@/types";
import {
    Button,
    Card,
    CardBody,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
    Input,
    Link,
    Modal,
    ModalContent,
    ModalFooter,
    ModalHeader,
    useDisclosure
} from "@heroui/react";
import {
    IconBriefcase2,
    IconBurger,
    IconBus,
    IconChevronDown,
    IconDots,
    IconHeart,
    IconHome,
    IconMapPin,
    IconPencil,
    IconTrain,
    IconTrash,
    IconTrees
} from "@tabler/icons-react";
import {useRouter} from "next/navigation";
import {JSX, useState} from "react";

const icons: Record<string, JSX.Element> = {
    bus: <IconBus />,
    train: <IconTrain />,
    home: <IconHome />,
    work: <IconBriefcase2 />,
    food: <IconBurger />,
    park: <IconTrees />,
    love: <IconHeart />
}

export function Favorites({favorites}: { favorites: Favorite[] }) {
    const router = useRouter();
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [editing, setEditing] = useState<Favorite | null>(null);
    const [name, setName] = useState("");
    const [type, setType] = useState("");

    if (!favorites) return null;

    function editFavorite() {
        if (!editing) return;

        const cookieString = decodeURIComponent(document.cookie
            .split('; ')
            .find(row => row.startsWith('favorites='))?.split('=')[1] || '[]');

        let savedFavorites: Favorite[];
        try {
            savedFavorites = JSON.parse(cookieString);
        } catch {
            savedFavorites = [];
        }

        const newFavorites = savedFavorites.map(f => f.id === editing.id ? {...f, name, type} : f);
        document.cookie = `favorites=${encodeURIComponent(JSON.stringify(newFavorites))}; path=/; max-age=${60 * 60 * 24 * 365}`;
        router.refresh();
        onClose();
    }

    function deleteFavorite(favorite: Favorite) {
        const cookieString = decodeURIComponent(document.cookie
            .split('; ')
            .find(row => row.startsWith('favorites='))?.split('=')[1] || '[]');

        let savedFavorites: Favorite[];
        try {
            savedFavorites = JSON.parse(cookieString);
        } catch {
            savedFavorites = [];
        }

        const newFavorites = savedFavorites.filter(f => f.id !== favorite.id);
        document.cookie = `favorites=${encodeURIComponent(JSON.stringify(newFavorites))}; path=/; max-age=${60 * 60 * 24 * 365}`;
        router.refresh();
    }

    return (<>
        <Card fullWidth
              className="p-4 max-w-4xl bg-gradient-to-tr from-content1 to-warning-300 transition-background">
            <div className="text-2xl font-bold text-center mx-auto">
                ⭐️ preferiti ⭐
            </div>
            <CardBody>
                {favorites.length ? favorites.slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((favorite: Favorite, index) => (
                        <div key={index} className="flex justify-between items-center py-2">
                            <Link color="foreground" href={`/departures/${favorite.id}`} className="gap-2">
                                {icons[favorite.type] ?? <IconMapPin />}
                                {favorite.name}
                            </Link>
                            <Dropdown placement="bottom-end">
                                <DropdownTrigger>
                                    <Button
                                        isIconOnly
                                        startContent={<IconDots />}
                                        radius="full"
                                        variant="flat"
                                        className="border-none"
                                    />
                                </DropdownTrigger>
                                <DropdownMenu variant="flat" key="options">
                                    <DropdownItem startContent={<IconPencil />} key="edit"
                                                  onPress={() => {
                                                      setEditing(favorite);
                                                      setName(favorite.name);
                                                      setType(favorite.type);
                                                      onOpen();
                                                  }}>Modifica</DropdownItem>
                                    <DropdownItem startContent={<IconTrash />} key="delete"
                                                  className="text-danger" color="danger"
                                                  onPress={() => deleteFavorite(favorite)}>Elimina</DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </div>)) : (<p className="text-center text-foreground-500">
                    qui vedrai le tue fermate e stazioni preferite!
                </p>)}
            </CardBody>
        </Card>

        <Modal isOpen={isOpen} onOpenChange={onClose} backdrop="blur" placement="center">
            <ModalContent>
                <ModalHeader>
                    <h1>Modifica preferito</h1>
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
                    <Button isDisabled={name.length === 0} onPress={editFavorite}>Salva</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    </>)
}