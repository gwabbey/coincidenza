'use client'

import { StopNews } from '@/types'
import { Anchor, Box, Modal, ScrollArea, Stack, Text, Title } from '@mantine/core'

interface NewsModalProps {
    opened: boolean
    onClose: () => void
    news: StopNews[]
}

export function NewsModal({ opened, onClose, news }: NewsModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Avvisi"
            centered
            size="xl"
            radius="lg"
            transitionProps={{ transition: 'fade', duration: 300 }}
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Stack align="stretch" justify="flex-start" gap="md">
                {news.map((newsItem, index) => (
                    <Box key={index}>
                        <Anchor inherit href={newsItem.url} target="_blank">
                            <Title order={3}>
                                {newsItem.header}
                            </Title>
                        </Anchor>
                        <Text>{newsItem.details}</Text>
                    </Box>
                ))}
            </Stack>
        </Modal >
    )
} 