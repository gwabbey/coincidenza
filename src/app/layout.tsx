import "./globals.css";
import Providers from "./providers";
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