import { Alert, Link } from "@heroui/react";
import NextLink from "next/link";

export default async function About() {
    return (
        <div className="flex flex-col gap-4 max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-center">il progetto</h1>
            <div>l'obiettivo del progetto è quello di fornire un'unica interfaccia semplice e moderna in cui pianificare un viaggio con i mezzi pubblici con informazioni
                precise e aggiornate in tempo reale, raccogliendo più dati pubblici possibili.</div>
            <Alert className="p-4 text-center max-w-2xl mx-auto" hideIcon variant="faded" color="warning">
                Questo progetto è realizzato esclusivamente a scopo personale e didattico. Tutti i dati utilizzati sono reperiti da fonti pubblicamente accessibili online.
                Tutti i diritti sui dati e sui contenuti appartengono ai rispettivi proprietari.
            </Alert>
            <div>il progetto è open source, pubblicato su <Link isExternal href="https://github.com/gwabbey">github</Link>.</div>

            <div className="flex flex-col">
                <div className="pt-4 font-bold">fonti:</div>
                <ul>
                    <li>Trentino Trasporti</li>
                    <li>Viaggiatreno</li>
                    <li>Monitor e quadri orario RFI</li>
                    <li>Trenord</li>
                    <li>ATV Verona</li>
                    <li>ATM Milano</li>
                    <li>ÖBB</li>
                    <li>DB</li>
                </ul>
            </div>
            <div className="italic">per più informazioni, domande, consigli, ecc. <Link as={NextLink} href="mailto:mail@g3b.dev">contattami!!</Link></div>
        </div>
    );
} 