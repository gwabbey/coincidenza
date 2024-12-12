import { Flex } from "@mantine/core";

export default function BusLayout({ children }: { children: React.ReactNode }) {
    return (
        <Flex
            justify="center"
            direction="column"
            wrap="wrap"
            ta="center"
            gap="md"
        >
            {children}
        </Flex>
    )
}
