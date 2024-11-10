'use client';
import {ActionIcon, Flex, useMantineColorScheme} from "@mantine/core";
import {IconMoon, IconSun} from "@tabler/icons-react";

export function Header() {
    const {colorScheme, toggleColorScheme} = useMantineColorScheme();

    return (
        <Flex align="center" justify="end" pt="md" pr="md">
            <ActionIcon
                onClick={toggleColorScheme}
                variant="default"
                size="xl"
                aria-label="Toggle color scheme"
            >
                {colorScheme === 'light' ? (<IconMoon stroke={1.5} />) : (<IconSun stroke={1.5} />)}
            </ActionIcon>
        </Flex>
    );
}