"use client"
import {Button, Card, CardBody, Divider, Link} from "@heroui/react";
import {IconBus, IconGps, IconTrain} from "@tabler/icons-react";
import {Favorites} from "@/app/favorites";

export const Home = ({alerts, favorites}: { alerts: any, favorites: any }) => {
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
                        startContent={<IconBus className="shrink-0" size={24} />}
                        className="font-bold text-lg sm:text-2xl p-4 text-wrap text-white bg-gradient-to-r from-green-500 to-lime-600">
                    partenze bus
                </Button>
            </Link>
            <Link href="/departures" className="w-full rounded-large">
                <Button fullWidth size='lg'
                        startContent={<IconTrain className="shrink-0" size={24} />}
                        className="font-bold text-lg sm:text-2xl p-4 text-wrap text-white bg-gradient-to-r from-red-500 to-red-700">
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
                    {alerts && alerts.map((alert: any, index: number) => (<div key={index} className="flex flex-col">
                        <Link href={alert.link} isExternal>{alert.title}</Link>
                    </div>))}
                </CardBody>
            </Card>}

            <Favorites favorites={favorites} />

            <Card className="flex flex-col gap-4 p-4 w-full">
                <div className="text-2xl font-bold text-center mx-auto">
                    il progetto
                </div>
                <CardBody className="gap-2">
                    <div className="flex flex-col gap-4 max-w-4xl mx-auto text-center">
                        <div>questo progetto nasce con lo scopo di rendere i viaggi con
                            mezzi pubblici i più semplici
                            e comodi possibili, con un focus sulla precisione dei dati e l'accessibilità.
                        </div>
                        {/*<div>
                            per sapere come sta andando lo sviluppo, ho iniziato a scrivere un "diario" qui
                        </div>*/}
                        <Divider />
                        <div>il progetto è open source, pubblicato su <Link isExternal
                                                                            href="https://github.com/gwabbey">github</Link>.
                        </div>
                        <Divider />

                        <div className="flex flex-col">
                            <div className="font-bold">dati</div>
                            <div>il servizio utilizza dati forniti pubblicamente da varie aziende.</div>
                            <div>man mano che il progetto cresce, vengono aggiunte sempre più aziende in diverse aree
                                d'italia e oltre i confini!
                            </div>
                        </div>
                        <Divider />
                        <div className="flex-col inline">
                            <div className="font-bold">mappe</div>
                            <Link isExternal href="https://maplibre.org">MapLibre</Link>, &copy; <Link
                            isExternal href="https://www.openstreetmap.org/copyright">OpenStreetMap</Link> contributors
                            ❤️
                        </div>
                        <Divider />
                        <div className="italic">per più informazioni, domande, consigli, idee, ecc. <Link
                            href="mailto:mail@g3b.dev">contattami !!</Link>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    </div>)
}