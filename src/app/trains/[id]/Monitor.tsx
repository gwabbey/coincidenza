'use client';
import { Badge, Group, Stack, Text } from '@mantine/core';
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

    console.log(monitor)

    return (
        <Stack w="100%" maw={750} mx="auto">
            {monitor.trains.map((train: any) => (
                <Group key={train.trainNumber} w="100%">
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
                        <Text fw="bold" fz="lg" tt="capitalize">
                            {train.destination}
                        </Text>
                        <Text tt="capitalize">
                            {train.category} {train.trainNumber}
                        </Text>
                    </Stack>
                </Group>
            ))
            }
        </Stack >
    );
}