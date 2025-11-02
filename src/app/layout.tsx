import "./globals.css";
import Providers from "./providers";
import React from "react";
import Header from "@/app/header";

export const metadata = {
    title: 'coincidenza.it',
    description: 'il modo più comodo per viaggiare con i mezzi pubblici.',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body>
        <Providers>
            <Header />
            <main className="p-4">
                {children}
            </main>
        </Providers>
        </body>
        </html>
    );
}