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
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
(function () {
  try {
    const ls = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = ls || (systemDark ? "dark" : "light");
    document.documentElement.classList.add(theme);
  } catch (_) {}
})();
`
                    }}
                />
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