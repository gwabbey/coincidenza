import { getRfiAlerts, getRfiNotices } from "@/api/trenitalia/api";
import { Button, Card, CardBody, CardHeader, Link } from "@heroui/react";
import { IconBus, IconInfoCircle, IconTrain } from "@tabler/icons-react";
import { cookies } from "next/headers";
import NextLink from "next/link";
import { Favorites } from "./favorites";

const links = [
    { href: "/bus", label: "partenze da una fermata", icon: IconBus, className: "bg-gradient-to-r dark:from-green-500 dark:to-blue-500 from-green-300 to-blue-300" },
    { href: "/departures", label: "partenze da una stazione", icon: IconTrain, className: "bg-gradient-to-r dark:from-red-500 dark:to-pink-500 from-red-300 to-pink-300" },
    { href: "/about", label: "info sul progetto", icon: IconInfoCircle, className: "bg-gradient-to-r dark:from-gray-500 dark:to-slate-500 from-gray-300 to-slate-300" },
]

export default async function Page() {
    const cookieStore = await cookies();
    const favorites = JSON.parse(decodeURIComponent(cookieStore.get('favorites')?.value ?? '[]'));
    const alerts = await getRfiAlerts(["Trentino Alto Adige", "Veneto", "Lombardia", "Friuli Venezia Giulia"]);
    const notices = await getRfiNotices(["Trentino Alto Adige"]);

    return (
        <div className="flex flex-col items-center justify-start gap-4 text-center">
            <h1 className="text-2xl font-bold">ciao!</h1>
            <h1 className="text-2xl max-w-2xl">pianifica il tuo viaggio senza problemi ✨</h1>

            {links.map((link, index) => (
                <Button variant="solid"
                    startContent={<link.icon />}
                    key={index}
                    className={`max-w-2xl w-full flex items-center justify-start h-16 font-bold sm:text-2xl text-lg shadow-medium ${link.className}`}
                    radius="md" size="lg" as={NextLink} href={link.href}
                >
                    {link.label}
                </Button>
            ))}

            {alerts.length > 0 && <Card className="flex flex-col p-2 gap-2 max-w-2xl w-full rounded-large shadow-medium text-left">
                <CardHeader className="text-xl font-bold pb-0">⚠️ avvisi sulla rete ferroviaria ⚠️</CardHeader>
                <CardBody className="gap-2">
                    {alerts && alerts.map((alert, index) => (
                        <div key={index} className="flex flex-col">
                            <Link href={alert.link} isExternal>{alert.title}</Link>
                        </div>
                    ))}
                </CardBody>
            </Card>}

            <Favorites favorites={favorites} />

            {notices.length > 0 && <Card className="flex flex-col p-2 gap-2 max-w-2xl w-full rounded-large shadow-medium text-left">
                <CardHeader className="text-xl font-bold pb-0">informazioni utili</CardHeader>
                <CardBody className="gap-2">
                    {notices && notices.map((alert, index) => (
                        <div key={index} className={`"flex flex-col ${alert.title.toLowerCase().includes("sciopero") ? "font-bold" : ""}`}>
                            <Link href={alert.link} isExternal>{alert.title}</Link>
                        </div>
                    ))}
                </CardBody>
            </Card>}
        </div>
    )
}