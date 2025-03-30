import { Alert, Link } from "@heroui/react";
import NextLink from "next/link";

export default async function About() {
    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">Il progetto</h1>
            <div>Ho realizzato questo sito per semplificare i viaggi col trasporto pubblico in Trentino.</div>
            <div>L'obiettivo è fornire un'unica interfaccia dove trovare tutte le informazioni necessarie da tutte le compagnie e linee presenti in regione.</div>
            <Alert className="p-4 text-center" hideIcon variant="faded" color="warning">
                Questo progetto è realizzato esclusivamente a scopo personale e didattico. Tutti i dati utilizzati sono reperiti da fonti pubblicamente accessibili online.
                Tutti i diritti sui dati e sui contenuti appartengono ai rispettivi proprietari.
            </Alert>
            <div>
                <h1 className="font-bold">Fonti:</h1>
                <ul className="flex flex-col justify-center items-center text-left mx-auto">
                    <li>STA - altoadigemobilità</li>
                    <li>Trentino Trasporti</li>
                    <li>Trenitalia Veneto</li>
                    <li>Trenord</li>
                    <li>ATV Verona</li>
                    <li>ÖBB</li>
                    <li>ATM Milano</li>
                </ul>
            </div>
            <p>I dati vengono aggiornati giornalmente.</p>
            <div className="italic">per più informazioni, domande, consigli, ecc. <Link as={NextLink} href="mailto:mail@g3b.dev">contattami!!</Link></div>
        </div>
    );
} 