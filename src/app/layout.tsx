// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';

import {ColorSchemeScript, MantineProvider} from '@mantine/core';
import {MotionWrapper} from "@/app/MotionWrapper";

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
            <MotionWrapper>
                {children}
            </MotionWrapper>
        </MantineProvider>
        </body>
        </html>
    );
}