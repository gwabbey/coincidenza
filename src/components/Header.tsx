'use client';
import {ActionIcon, Flex, Text, useMantineColorScheme} from "@mantine/core";
import {IconMoon, IconSun} from "@tabler/icons-react";
import Link from "next/link";

export function Header() {
    const {colorScheme, toggleColorScheme} = useMantineColorScheme();

    return (
        <Flex align="center" justify="space-between" pt="md" px="md">
            <Text component={Link} href="https://trasporti.g3b.dev" size="lg" fw={200}
                  fs="italic">trasporti.g3b.dev</Text>
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