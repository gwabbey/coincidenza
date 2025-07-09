import dynamic from 'next/dynamic';
import "./globals.css";
import { Header } from "./header";
const Providers = dynamic(() => import('./providers'), { ssr: false })

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