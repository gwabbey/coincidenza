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
    const rfiAlerts = await getRfiAlerts(["Trentino Alto Adige", "Veneto"]);
    const rfiNotices = await getRfiNotices(["Trentino Alto Adige", "Veneto"]);

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

            {rfiAlerts.length > 0 && <div className="flex flex-col gap-2 p-2 border-opacity-50 border-gray-500 border-1 max-w-2xl w-full rounded-large">
                <div className="text-lg font-bold">⚠️ avvisi sulla rete ferroviaria ⚠️</div>
                {rfiAlerts && rfiAlerts.map((alert) => (
                    <Card className="max-w-2xl p-4 text-left" as={NextLink} href={alert.link}>
                        <p>{alert.title}</p>
                    </Card>
                ))}
            </div>}


            <Favorites favorites={favorites} />

            {rfiNotices.length > 0 && <Card className="flex flex-col p-2 gap-2 max-w-2xl w-full rounded-large shadow-medium text-left">
                <CardHeader className="text-xl font-bold pb-0">informazioni utili</CardHeader>
                <CardBody className="gap-2">
                    {rfiNotices && rfiNotices.map((alert, index) => (
                        <div key={index} className={`"flex flex-col ${alert.title.toLowerCase().includes("sciopero") ? "font-bold" : ""}`}>
                            <Link href={alert.link} isExternal>{alert.title}</Link>
                        </div>
                    ))}
                </CardBody>
            </Card>}
        </div>
    )
}