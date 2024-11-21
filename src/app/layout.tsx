// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { Header } from "@/components/Header";
import { ColorSchemeScript, Container, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ProxyAgent, setGlobalDispatcher } from "undici";

export const metadata = {
    title: 'Trentino Trasporti',
    description: '',
};


if (process.env.PROXY_AGENT) {
    const proxyAgent = new ProxyAgent(process.env.PROXY_AGENT);
    setGlobalDispatcher(proxyAgent);
}

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