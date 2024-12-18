'use client'

import '@aarsteinmedia/dotlottie-player';
import { Text } from '@mantine/core';
import { motion } from 'motion/react';

interface DotLottieProps {
    src: string;
    width?: string
    height?: string
}

export function DotLottie({ src, width = '320px', height = 'auto' }: DotLottieProps) {
    return (
        <motion.div style={{ width, height }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <dotlottie-player
                src={src}
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
            />
            <Text fw="bold" ta="center" c="dimmed" size="lg">Caricamento...</Text>
        </motion.div>
    )
}
