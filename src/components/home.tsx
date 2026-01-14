"use client"
import {Button, Card, CardBody, Divider, Link} from "@heroui/react";
import {Favorites} from "@/app/favorites";
import React, {useEffect} from "react";
import Image from "next/image";

export const Home = ({alerts, favorites}: { alerts: any, favorites: any }) => {
    useEffect(() => {
        const migrated = document.cookie
            .split("; ")
            .some(row => row.startsWith("favorites_migrated="));

        if (migrated) return;
        document.cookie = `favorites=[]; path=/; max-age=0`;
        document.cookie = `favorites_migrated=true; path=/; max-age=${60 * 60 * 24 * 30}`;
    }, []);

    return (<div className="flex flex-col items-center justify-center gap-8 text-center max-w-4xl w-full mx-auto">
        <div className="flex flex-col gap-y-2">
            <h1 className="text-5xl font-thin text-center">coincidenza</h1>
            <div className="text-xl max-w-4xl">pianifica i tuoi spostamenti senza problemi!</div>
        </div>

        <div className="flex flex-col gap-y-4 w-full">
            <Button as={Link} href="/directions" fullWidth size="lg"
                    className="relative font-bold text-4xl p-12 text-white overflow-hidden shadow-medium">
                <Image src="/extraurbano.jpg" alt="calcola percorso" fill className="object-cover object-center -z-10"
                       priority />
                <span className="absolute inset-0 bg-black opacity-50 -z-10" />
                <span className="relative z-10">calcola percorso</span>
            </Button>
            <Button
                as={Link} href="/departures" fullWidth size="lg"
                className="relative font-bold text-3xl p-12 text-white overflow-hidden shadow-medium">
                <Image src="/station.png" alt="partenze bus e treni" fill className="object-cover object-center -z-10"
                       priority />
                <span className="absolute inset-0 bg-black opacity-50 -z-10" />
                <span className="relative z-10">partenze bus e treni</span>
            </Button>
        </div>

        <div className="flex flex-col gap-8 w-full">
            {alerts.length > 0 && <Card className="flex flex-col gap-4 p-4 w-full">
                <div className="text-2xl font-bold text-center mx-auto">
                    ⚠️ Avvisi ⚠️
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
                    Il progetto
                </div>
                <CardBody className="gap-2">
                    <div className="flex flex-col gap-4 max-w-4xl mx-auto text-center">
                        <div><strong>coincidenza.it</strong> ha lo scopo di rendere i viaggi con i mezzi
                            pubblici <strong>semplici
                                e comodi</strong>, con particolare attenzione ai dati in tempo reale, la precisione e
                            l'accessibilità.
                        </div>
                        {/*<div>
                            per sapere come sta andando lo sviluppo, ho iniziato a scrivere un "diario" qui
                        </div>*/}
                        <Divider />
                        <div>il progetto è <strong>open source</strong>, pubblicato su <Link isExternal
                                                                                             href="https://github.com/gwabbey">github</Link>.
                        </div>
                        <Divider />

                        <div className="flex flex-col gap-y-2">
                            <div>Il servizio utilizza <strong>dati pubblici</strong> di varie aziende.</div>
                            <div>Tra queste al momento sono supportate Trentino Trasporti, Trenitalia, STA, Trenord,
                                ATV, Arriva, ATM, ACTV, MOM, Busitalia, ecc.
                            </div>
                            <div>
                                Con la crescita del progetto, verranno progressivamente integrate nuove compagnie,
                                estendendo il servizio al resto d’Italia e, in futuro, anche ad altri Stati.
                            </div>
                        </div>
                        <Divider />
                        <div className="flex-col inline">
                            <div className="font-bold">Mappe</div>
                            <Link isExternal href="https://maplibre.org">MapLibre</Link>, &copy; <Link
                            isExternal href="https://www.openstreetmap.org/copyright">OpenStreetMap</Link> contributors
                            ❤️
                        </div>
                        <Divider />
                        <div className="italic">Per più informazioni, domande, consigli, idee, ecc. non esitare a <Link
                            href="mailto:mail@g3b.dev">contattarmi !!</Link>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    </div>)
}