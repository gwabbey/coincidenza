import "./globals.css";
import { Header } from "./header";
import { Providers } from "./providers";

export const metadata = {
    title: 'trasporti.g3b.dev',
    description: 'viaggia con i mezzi pubblici nel chill',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
                <meta name="theme-color" content="#000000" />
            </head>
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