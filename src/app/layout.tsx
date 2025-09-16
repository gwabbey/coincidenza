import "./globals.css";
import Providers from "./providers";
import {ViewTransitions} from "next-view-transitions";
import React from "react";
import Header from "@/app/header";

export const metadata = {
    title: 'trasporti.g3b.dev',
    description: 'viaggia senza problemi.',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <ViewTransitions>
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
        </ViewTransitions>
    );
}