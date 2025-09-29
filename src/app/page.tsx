import {getNearestStation, getRfiAlerts, getRfiNotices} from "@/api/trenitalia/api";
import {cookies} from "next/headers";
import {getMonitor} from "@/api/trenitalia/monitor";
import {Button, Card, CardBody, Link} from "@heroui/react";
import NextLink from "next/link";
import {Favorites} from "@/app/favorites";
import RequestLocation from "@/app/location";
import DeparturesCard from "@/app/departures-card";
import {IconBus, IconGps, IconTrain} from "@tabler/icons-react";

export default async function Page() {
    const cookieStore = await cookies();
    const favorites = JSON.parse(decodeURIComponent(cookieStore.get('favorites')?.value ?? '[]'));
    const userLat = cookieStore.get("userLat")?.value ?? "";
    const userLon = cookieStore.get("userLon")?.value ?? "";

    let departures = null;
    let rfiId = "";
    let vtId = "";

    if (userLat && userLon) {
        const station = getNearestStation(Number(userLat), Number(userLon));
        if (station?.rfiId && station?.vtId) {
            rfiId = station.rfiId;
            vtId = station.vtId;
            departures = await getMonitor(rfiId, vtId);
        }
    }

    const alerts = await getRfiAlerts(["Trentino Alto Adige"]);
    const notices = await getRfiNotices(["Trentino Alto Adige"]);

    return (
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-4xl w-full mx-auto">
            <h1 className="text-4xl font-bold">hey</h1>
            <h1 className="text-2xl max-w-4xl">pianifica i tuoi spostamenti senza problemi ✨</h1>

            <Button as={NextLink} href="/directions" fullWidth size='lg'
                    startContent={<IconGps className="shrink-0" size={32} />}
                    className="font-bold text-2xl p-8 text-white bg-gradient-to-r from-blue-500 to-purple-600">
                calcola percorso
            </Button>
            <div className="flex flex-row items-center justify-center gap-x-4 w-full">
                <Button as={NextLink} href="/bus" fullWidth size='lg'
                        startContent={<IconBus className="shrink-0" />}
                        className="font-bold text-lg sm:text-2xl p-8 text-wrap text-white bg-gradient-to-r from-green-500 to-lime-600">
                    partenze bus
                </Button>
                <Button as={NextLink} href="/departures" fullWidth size='lg'
                        startContent={<IconTrain className="shrink-0" />}
                        className="font-bold text-lg sm:text-2xl p-8 text-wrap text-white bg-gradient-to-r from-red-500 to-red-700">
                    partenze treni
                </Button>
            </div>

            <div className="flex flex-col gap-4 w-full">
                {alerts.length > 0 &&
                    <Card className="flex flex-col gap-4 p-4 w-full">
                        <div className="text-2xl font-bold text-center mx-auto">
                            ⚠️ avvisi ⚠️
                        </div>
                        <CardBody className="gap-2">
                            {alerts && alerts.map((alert, index) => (
                                <div key={index} className="flex flex-col">
                                    <Link href={alert.link} isExternal>{alert.title}</Link>
                                </div>
                            ))}
                        </CardBody>
                    </Card>}

                <Favorites favorites={favorites} />

                {!userLat || !userLon || !rfiId || !vtId ? (
                    <RequestLocation />
                ) : (
                    <DeparturesCard departures={departures!} />
                )}

                {notices.length > 0 &&
                    <Card className="flex flex-col gap-4 p-4 w-full">
                        <div className="text-2xl font-bold text-center mx-auto">
                            informazioni utili
                        </div>
                        <CardBody className="gap-2">
                            {notices && notices.map((alert, index) => (
                                <div key={index}
                                     className={`flex flex-col ${alert.title.toLowerCase().includes("sciopero") ? "font-bold" : ""}`}>
                                    <Link href={alert.link} isExternal>{alert.title}</Link>
                                </div>
                            ))}
                        </CardBody>
                    </Card>}
            </div>
        </div>
    );
}