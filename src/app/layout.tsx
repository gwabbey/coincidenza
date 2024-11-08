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
        <html lang="en" suppressHydrationWarning>
        <head>
            <ColorSchemeScript defaultColorScheme="auto" />
        </head>
        <body>
        <MantineProvider defaultColorScheme="auto">
            {/*<header style={{
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'gold',
                padding: '8px',
                zIndex: 1000,
                color: 'black',
            }}>
                I dati utilizzati provengono direttamente da Trentino Trasporti. Per segnalare eventuali problemi o per
                domande e chiarimenti, contattami all'indirizzo <Link href="mailto:mail@g3b.dev">mail@g3b.dev</Link>.
            </header>*/}
            <Container fluid h="100%" py="xl">
                {children}
            </Container>
        </MantineProvider>
        </body>
        </html>
    );
}