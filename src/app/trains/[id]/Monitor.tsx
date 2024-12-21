'use client';
import { Badge, Divider, Flex, Group, Stack, Text } from '@mantine/core';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Monitor({ monitor }: { monitor: any }) {
    const router = useRouter();
    const [blinkKey, setBlinkKey] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh();
        }, parseInt(process.env.AUTO_REFRESH || '10000', 10));
        return () => clearInterval(intervalId);
    }, [router]);

    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlinkKey(prev => prev + 1);
        }, 1000);
        return () => clearInterval(blinkInterval);
    }, []);

    if (monitor.error) {
        return <Text ta="center" fz="lg" c="dimmed" fw="bold" p="xl">{monitor.error}</Text>;
    }

    if (monitor.trains.length === 0) {
        return <Text ta="center" fz="lg" c="dimmed" fw="bold" p="xl">Nessun treno in partenza</Text>;
    }

    const calculateDestinationWidth = (delay: string) => {
        let baseWidth = 225;
        if (delay !== '0') {
            const delayLength = delay.length;
            baseWidth = Math.max(100, 225 - (delayLength * 10));
        }
        return baseWidth;
    };

    return (
        <Stack w="100%" maw={750} mx="auto">
            <AnimatePresence>
                {monitor.trains.map((train: any) => (
                    <motion.div
                        key={train.number}
                        layout
                        layoutId={train.number.toString()}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{ width: '100%' }}
                        transition={{
                            duration: 0.5,
                            ease: 'easeInOut'
                        }}
                    >
                        <Flex w="100%">
                            <Group w="100%" gap="xs" wrap="nowrap">
                                <Badge
                                    size="xl"
                                    color="gray"
                                    px={0}
                                    py="md"
                                    miw={60}
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
                                        {train.shortCategory || train.company} {train.number} {train.shortCategory && train.company && `• ${train.company}`}
                                    </Text>
                                    {!train.departing ? (
                                        <Group gap={0} style={{ whiteSpace: "pre" }}>
                                            {train.platform !== "Piazzale Ferrovia" && (
                                                <Text fz="sm" c="dimmed">
                                                    {train.platform ? "binario " : ""}
                                                </Text>
                                            )}
                                            <Text fz="sm" c="blue" fw="bold">
                                                {train.platform}
                                            </Text>
                                        </Group>
                                    ) : (
                                        <Group gap={0} style={{ whiteSpace: "pre" }}>
                                            <Text fz="sm" c="green" fw="bold">
                                                in partenza{" "}
                                            </Text>
                                            {train.platform && train.platform !== "Piazzale Ferrovia" && (
                                                <Text fz="sm" c="dimmed">
                                                    • binario{" "}
                                                </Text>
                                            )}
                                            <motion.div
                                                key={blinkKey}
                                                initial={{ opacity: 1 }}
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{
                                                    duration: 1,
                                                    times: [0, 0.5, 1],
                                                    ease: 'easeInOut'
                                                }}
                                            >
                                                <Text fz="sm" c="blue" fw="bold">
                                                    <strong>{train.platform}</strong>
                                                </Text>
                                            </motion.div>
                                        </Group>
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
                    </motion.div>
                ))}
            </AnimatePresence>
            <Divider />
            <Text c="dimmed" ta="center">
                {monitor.alerts}
            </Text>
        </Stack>
    );
}
