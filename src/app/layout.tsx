import "./globals.css";
import { Header } from "./header";

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
            <head>
                <script dangerouslySetInnerHTML={{
                    __html: `(function () {
          try {
            const theme = localStorage.getItem('theme')
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            const resolved = theme === 'dark' || (!theme && systemDark) ? 'dark' : 'light'
            document.documentElement.classList.add(resolved)
          } catch (_) {}
        })()`
                }} />
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