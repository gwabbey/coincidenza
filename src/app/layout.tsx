import "./globals.css";

import { Header } from "@/components/header";
import { Providers } from "./providers";

export const metadata = {
    title: 'trasporti.g3b.dev',
    description: '',
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