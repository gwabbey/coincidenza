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
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
      (function () {
        function setTheme() {
          try {
            const ls = localStorage.getItem("theme");
            const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const theme = ls || (systemDark ? "dark" : "light");
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(theme);
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';
          } catch (_) {
            document.documentElement.classList.add('light');
            document.documentElement.style.backgroundColor = '#ffffff';
          }
        }
        
        setTheme();
        
        window.addEventListener('storage', setTheme);
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