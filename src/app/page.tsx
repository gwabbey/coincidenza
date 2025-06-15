import { Button } from "@heroui/react";
import { IconBus, IconInfoCircle, IconTrain } from "@tabler/icons-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Favorites } from "./favorites";

const links = [
    { href: "/bus", label: "partenze da una fermata", icon: IconBus, className: "bg-gradient-to-r dark:from-green-500 dark:to-purple-500 from-green-300 to-purple-300" },
    { href: "/departures", label: "partenze da una stazione", icon: IconTrain, className: "bg-gradient-to-r dark:from-cyan-500 dark:to-blue-500 from-cyan-300 to-blue-300" },
    { href: "/about", label: "info sul progetto", icon: IconInfoCircle, className: "bg-gradient-to-r dark:from-gray-500 dark:to-slate-500 from-gray-300 to-slate-300" },
]

export default async function Page() {
    const cookieStore = await cookies();
    const favorites = JSON.parse(decodeURIComponent(cookieStore.get('favorites')?.value ?? '[]'));

    return (
        <div className="flex flex-col items-center justify-start gap-4 text-center">
            <h1 className="text-2xl font-bold">hey 👋</h1>
            <h1 className="text-2xl max-w-2xl">pianifica il tuo viaggio senza problemi ✨</h1>
            {links.map((link, index) => (
                <Button variant="solid"
                    startContent={<link.icon />}
                    key={index}
                    className={`max-w-2xl w-full flex items-center justify-start h-16 font-bold sm:text-2xl text-lg shadow-medium ${link.className}`}
                    radius="md" size="lg" as={Link} href={link.href}
                >
                    {link.label}
                </Button>
            ))}
            <Favorites favorites={favorites} />
        </div>
    )
}