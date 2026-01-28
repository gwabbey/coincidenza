import "./globals.css";
import Providers from "./providers";
import React from "react";
import Header from "@/app/header";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'coincidenza', description: 'pianifica i tuoi spostamenti senza problemi',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning>
    <body>
    <meta name="keywords"
          content="coincidenza, trasporti, trentino, trenitalia, orari, tempo, reale, bus, treni, autobus, trento, calliano, rovereto, verona, bolzano, viaggatreno, gratuito, gratis, nuovi, rfi, ferrovie, atv" />
    <meta name="viewport"
          content="width=device-width, height=device-height, initial-scale=1, minimum-scale=1, viewport-fit=cover" />
    <meta property="og:title" content="coincidenza" />
    <meta property="og:description" content="pianifica i tuoi spostamenti senza problemi" />
    <meta property="og:image" content="/android-chrome-192x192.png" />
    <Providers>
        <Header />
        <main className="p-4 pt-18">
            {children}
        </main>
    </Providers>
    </body>
    </html>);
}