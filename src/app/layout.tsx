// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';

import {ColorSchemeScript, Container, MantineProvider} from '@mantine/core';

export const metadata = {
    title: 'Trentino Trasporti',
    description: '',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <head>
            <ColorSchemeScript />
        </head>
        <body>
        <MantineProvider>
            <header style={{
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'gold',
                padding: '8px',
                zIndex: 1000,
            }}>
                I dati utilizzati provengono direttamente da Trentino Trasporti. Eventuali problemi come lentezza, dati
                mancanti o inesatti non sono di mia responsabilità.
                Per ulteriori domande o chiarimenti, non esitate a contattarmi.
            </header>
            <Container fluid h="100%">
                {children}
            </Container>
        </MantineProvider>
        </body>
        </html>
    );
}