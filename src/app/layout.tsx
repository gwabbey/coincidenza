// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import { Header } from "@/components/Header";
import { ColorSchemeScript, Container, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

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
                <ColorSchemeScript defaultColorScheme="dark" />
            </head>
            <body>
                <MantineProvider defaultColorScheme="dark">
                    <Notifications />
                    <Header />
                    <Container fluid h="100%" pb="xl">
                        {children}
                    </Container>
                </MantineProvider>
            </body>
        </html>
    );
}