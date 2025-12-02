import {getRfiAlerts} from "@/api/trenitalia/api";
import {cookies} from "next/headers";
import {Button} from "@heroui/button";
import {Card, CardBody} from "@heroui/card";
import {Favorites} from "@/app/favorites";
import RequestLocation from "@/app/location";
import {IconBus, IconGps, IconTrain} from "@tabler/icons-react";
import Link from "next/link";

export default async function Page() {
    const cookieStore = await cookies();
    const favorites = JSON.parse(decodeURIComponent(cookieStore.get('favorites')?.value ?? '[]'));
    const userLat = cookieStore.get("userLat")?.value ?? "";
    const userLon = cookieStore.get("userLon")?.value ?? "";
    const alerts = await getRfiAlerts(["Trentino Alto Adige"]);

    let rfiId = "";
    let vtId = "";

    return (<div className="flex flex-col items-center justify-center gap-4 text-center max-w-4xl w-full mx-auto">
        <h1 className="text-4xl font-extrabold font-stretch-extra-expanded">coincidenza.it</h1>
        <h1 className="text-2xl max-w-4xl">pianifica i tuoi spostamenti senza problemi ✨</h1>

        <Link href="/directions" className="w-full rounded-large">
            <Button fullWidth size='lg'
                    startContent={<IconGps className="shrink-0" size={32} />}
                    className="font-bold text-2xl p-8 text-white bg-gradient-to-r from-blue-500 to-purple-600">
                calcola percorso
            </Button>
        </Link>
        <div className="flex flex-row items-center justify-center gap-x-4 w-full">
            <Link href="/bus" className="w-full rounded-large">
                <Button fullWidth size='lg'
                        startContent={<IconBus className="shrink-0" />}
                        className="font-bold text-lg sm:text-2xl p-8 text-wrap text-white bg-gradient-to-r from-green-500 to-lime-600">
                    partenze bus
                </Button>
            </Link>
            <Link href="/departures" className="w-full rounded-large">
                <Button fullWidth size='lg'
                        startContent={<IconTrain className="shrink-0" />}
                        className="font-bold text-lg sm:text-2xl p-8 text-wrap text-white bg-gradient-to-r from-red-500 to-red-700">
                    partenze treni
                </Button>
            </Link>
        </div>

        <div className="flex flex-col gap-4 w-full">
            {alerts.length > 0 && <Card className="flex flex-col gap-4 p-4 w-full">
                <div className="text-2xl font-bold text-center mx-auto">
                    ⚠️ avvisi ⚠️
                </div>
                <CardBody className="gap-2">
                    {alerts && alerts.map((alert, index) => (<div key={index} className="flex flex-col">
                        <Link href={alert.link}
                              className="relative inline-flex items-center tap-highlight-transparent outline-solid outline-transparent data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-medium text-primary no-underline hover:opacity-hover active:opacity-disabled transition-opacity">{alert.title}</Link>
                    </div>))}
                </CardBody>
            </Card>}

            <Favorites favorites={favorites} />

            {!userLat || !userLon || !rfiId || !vtId && (<RequestLocation />)}

            <Card className="flex flex-col gap-4 p-4 w-full">
                <div className="text-2xl font-bold text-center mx-auto">
                    il progetto
                </div>
                <CardBody className="gap-2">
                    <div className="flex flex-col gap-4 max-w-4xl mx-auto text-center">
                        <div>l'obiettivo di questo progetto è quello di fornire un'unica interfaccia semplice,
                            moderna e veloce in cui pianificare i propri viaggi con i mezzi pubblici usando
                            informazioni precise e aggiornate in tempo reale e raccogliendo più dati pubblici possibili.
                        </div>
                        <div>il progetto è open source, pubblicato su <Link
                            className="relative inline-flex items-center tap-highlight-transparent outline-solid outline-transparent data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-medium text-primary no-underline hover:opacity-hover active:opacity-disabled transition-opacity"
                            href="https://github.com/gwabbey">github</Link>.
                        </div>

                        <div className="flex flex-col">
                            <div className="pt-4 font-bold">fonti dati:</div>
                            Trentino Trasporti, Viaggiatreno, RFI, Trenord, ATV, ATM, ÖBB, DB
                        </div>
                        <div className="flex-col inline">
                            <div className="pt-4 font-bold">fonti mappe:</div>
                            <Link href="https://leafletjs.com">Leaflet</Link>, &copy; <Link
                            className="relative inline-flex items-center tap-highlight-transparent outline-solid outline-transparent data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-medium text-primary no-underline hover:opacity-hover active:opacity-disabled transition-opacity"
                            href="https://www.openstreetmap.org/copyright">OpenStreetMap</Link> contributors
                        </div>
                        <div className="italic">per più informazioni, domande, consigli, ecc. <Link
                            className="relative inline-flex items-center tap-highlight-transparent outline-solid outline-transparent data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-medium text-primary no-underline hover:opacity-hover active:opacity-disabled transition-opacity"
                            href="mailto:mail@g3b.dev">contattami
                            !!</Link>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    </div>);
}