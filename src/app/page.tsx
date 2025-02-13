import { Button } from "@heroui/react";
import { IconBus, IconRoute, IconTrain } from "@tabler/icons-react";
import Link from "next/link";

const links = [
    { href: "/directions", label: "Cerca itinerario", icon: IconRoute },
    { href: "/bus", label: "Cerca fermata autobus", icon: IconBus },
    { href: "/trains", label: "Cerca stazione ferroviaria", icon: IconTrain },
]

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-start gap-4">
            {links.map((link, index) => (
                <Button variant="solid"
                    startContent={<link.icon />}
                    key={index}
                    className="bg-gradient-to-r dark:from-violet-500 dark:to-indigo-500 from-violet-300 to-indigo-300 max-w-2xl w-full flex items-center justify-start"
                    radius="md" size="lg" as={Link} href={link.href}
                >
                    {link.label}
                </Button>
            ))}
        </div>
    )
}