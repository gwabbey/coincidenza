/* import { Divider, Flex, Group, Skeleton, Stack } from '@mantine/core';

export function MonitorSkeleton() {
    return (
        <Stack w="100%" maw={750} mx="auto">
            {[...Array(15)].map((_, index) => (
                <Flex key={index} w="100%">
                    <Group w="100%" gap="xs" wrap="nowrap">
                        <Skeleton height={34} width={60} radius="xl" />
                        <Stack gap={0} ta="left">
                            <Skeleton height={24} width={200} mb={4} />
                            <Skeleton height={18} width={150} mb={4} />
                            {index % 2 === 0 && <Skeleton height={18} width={100} />}
                        </Stack>
                    </Group>
                </Flex>
            ))}
            <Divider />
            <Skeleton height={16} width="60%" mx="auto" />
        </Stack>
    );
}  */