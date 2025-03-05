import { Button } from "@heroui/react";
import { IconRoute, IconTrain } from "@tabler/icons-react";
import Link from "next/link";

const links = [
    { href: "/directions", label: "cerca itinerario", icon: IconRoute },
    { href: "/departures", label: "partenze da una stazione", icon: IconTrain },
]

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-start gap-4 text-center">
            <h1 className="text-2xl font-bold">heyyyyyy</h1>
            <h1 className="text-2xl max-w-2xl">spero che questo sito ti aiuti a pianificare un viaggio con i mezzi pubblici senza problemi :)</h1>
            {links.map((link, index) => (
                <Button variant="solid"
                    startContent={<link.icon />}
                    key={index}
                    className="bg-gradient-to-r dark:from-violet-500 dark:to-indigo-500 from-violet-300 to-indigo-300 max-w-2xl w-full flex items-center justify-start h-16 font-bold sm:text-2xl text-lg"
                    radius="md" size="lg" as={Link} href={link.href}
                >
                    {link.label}
                </Button>
            ))}
            <div className="max-w-2xl italic">per più informazioni sul progetto clicca il <strong>?</strong> in alto a destra</div>
        </div>
    )
}