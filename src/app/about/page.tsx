import { Link } from "@heroui/react";
import NextLink from "next/link";

export default async function About() {
    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">il progetto</h1>
            <div>ho realizzato questo sito per semplificare i viaggi col trasporto pubblico in italia.</div>
            <div>per il momento il mio focus è il trentino alto adige, ma sarebbe bello espandere il progetto ad altre regioni e stati! :)</div>
            <div className="font-bold bg-warning p-4">
                questo progetto è realizzato esclusivamente a scopo personale e didattico. non è in alcun modo monetizzato né inteso per uso commerciale.
                tutti i dati utilizzati sono reperiti da fonti pubblicamente accessibili online. tutti i diritti sui dati e sui contenuti appartengono ai rispettivi proprietari.
                non si garantisce l'accuratezza o l'aggiornamento delle informazioni fornite.
            </div>
            <div>
                <h1 className="font-bold">fonti dei dati utilizzati</h1>
                <ul className="flex flex-col justify-center items-center text-left p-4 mx-auto">
                    <li>STA - altoadigemobilità - südtirolmobil</li>
                    <li>Trentino Trasporti</li>
                    <li>Trenitalia Veneto</li>
                    <li>Trenord</li>
                    <li>ÖBB</li>
                    <li>ATM Milano</li>
                    <li>ATV Verona</li>
                </ul>
                <p>i dati vengono aggiornati giornalmente</p>
            </div>
            <div>per più informazioni, domande, consigli, ecc. <Link as={NextLink} href="mailto:mail@g3b.dev">contattami!!</Link></div>
        </div>
    );
} 