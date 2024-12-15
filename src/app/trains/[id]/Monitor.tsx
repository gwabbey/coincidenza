'use client';
import { Badge, Divider, Flex, Group, Stack, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function Monitor({ monitor }: { monitor: any }) {
    const router = useRouter();

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, parseInt(process.env.AUTO_REFRESH || '10000', 10));
        return () => clearInterval(intervalId);
    }, [router]);

    if (monitor.error) {
        return <Text ta="center" fz="lg" c="dimmed" fw="bold" p="xl">{monitor.error}</Text>;
    }

    if (monitor.trains.length === 0) {
        return <Text ta="center" fz="lg" c="dimmed" fw="bold" p="xl">Nessun treno in partenza</Text>;
    }

    console.log(monitor)

    const calculateDestinationWidth = (delay: string) => {
        let baseWidth = 200;
        if (delay !== '0') {
            const delayLength = delay.length;
            baseWidth = Math.max(100, 200 - (delayLength * 10));
        }
        return baseWidth;
    };

    return (
        <Stack w="100%" maw={750} mx="auto">
            {monitor.trains.map((train: any, index: number) => (
                <Flex key={index} w="100%">
                    <Group key={train.trainNumber} w="100%" gap="xs">
                        <Badge
                            size="xl"
                            color="gray"
                            px={0}
                            py="md"
                            miw={75}
                            ta="center"
                            autoContrast
                        >
                            {train.departureTime}
                        </Badge>
                        <Stack gap={0} ta="left">
                            <Text
                                fw="bold"
                                fz={{ base: 'md', sm: 'lg' }}
                                tt="capitalize"
                                truncate
                                w={{
                                    base: calculateDestinationWidth(train.delay),
                                    xs: "auto"
                                }}
                            >
                                {train.destination}
                            </Text>
                            <Text fz="sm" c="dimmed" tt="capitalize">
                                {train.category} {train.trainNumber}
                            </Text>
                            {train.departing && (
                                <Text c="green" fw="bold">
                                    in partenza
                                </Text>
                            )}
                        </Stack>
                        <Flex flex={1} />
                        {train.delay !== '0' && (
                            <Flex justify="end" align="center">
                                <Text size="lg" fw="bold" ta="right" tt="uppercase">
                                    {parseInt(train.delay) > 0 ? `+${train.delay}'` : train.delay}
                                </Text>
                            </Flex>
                        )}
                    </Group>
                </Flex>
            ))}
            <Divider />
            <Text c="dimmed" ta="center">
                {monitor.alerts}
            </Text>
        </Stack>
    );
}