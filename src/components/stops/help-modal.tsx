'use client'

import { Group, Modal, Stack } from '@mantine/core'
import Image from 'next/image'

interface HelpModalProps {
    opened: boolean
    onClose: () => void
}

export function HelpModal({ opened, onClose }: HelpModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Come trovo il codice di una fermata?"
            centered
            radius="lg"
            size="xl"
            transitionProps={{ transition: 'fade', duration: 300 }}
        >
            <Stack align="stretch" justify="flex-start" gap="md">
                <div>
                    Ogni fermata di Trentino Trasporti ha un <strong>codice univoco</strong>, indicato sui fogli
                    informativi delle linee. Questo codice può essere utile per distinguere fermate con lo stesso
                    nome ma situate su <strong>lati opposti della strada</strong>.
                </div>
                <Group justify="center">
                    <Image
                        src="/urban-trento.png"
                        alt="Urbano Trento"
                        height={100}
                        width={200}
                        style={{ objectFit: 'cover' }}
                    />
                    <Image
                        src="/urban-rovereto.png"
                        alt="Urbano Rovereto"
                        height={200}
                        width={200}
                        style={{ objectFit: 'cover' }}
                    />
                    <Image
                        src="/extraurban.png"
                        alt="Extraurbano"
                        height={150}
                        width={300}
                        style={{ objectFit: 'cover' }}
                    />
                </Group>
            </Stack>
        </Modal>
    )
} 