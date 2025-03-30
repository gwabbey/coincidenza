import { Button } from "@heroui/react";
import { IconRoute, IconTrain } from "@tabler/icons-react";
import Link from "next/link";

const links = [
    { href: "/directions", label: "cerca itinerario", icon: IconRoute, className: "bg-gradient-to-r dark:from-violet-500 dark:to-indigo-500 from-violet-300 to-indigo-300" },
    { href: "/departures", label: "partenze da una stazione", icon: IconTrain, className: "bg-gradient-to-r dark:from-cyan-500 dark:to-blue-500 from-cyan-300 to-blue-300" }
]

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-start gap-4 text-center">
            <h1 className="text-2xl font-bold">Ciao!</h1>
            <h1 className="text-2xl max-w-2xl">Pianifica un viaggio con i mezzi pubblici senza problemi ✨</h1>
            {links.map((link, index) => (
                <Button variant="solid"
                    startContent={<link.icon />}
                    key={index}
                    className={`max-w-2xl w-full flex items-center justify-start h-16 font-bold sm:text-2xl text-lg ${link.className}`}
                    radius="md" size="lg" as={Link} href={link.href}
                >
                    {link.label}
                </Button>
            ))}
            <div className="max-w-2xl italic">per più informazioni sul progetto clicca il <strong>?</strong> in alto a destra</div>
        </div>
    )
}