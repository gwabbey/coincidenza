import "./globals.css";
import Providers from "./providers";
import React from "react";
import Header from "@/app/header";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'coincidenza', description: 'il modo più comodo per viaggiare con i mezzi pubblici.',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning>
    <body>
    <Providers>
        <Header />
        <main className="p-4">
            {children}
        </main>
    </Providers>
    </body>
    </html>);
}