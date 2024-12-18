'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Text } from '@mantine/core';
import { motion } from 'motion/react';

export function BusSkeleton() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <DotLottieReact
                src="/bus.lottie"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
            />
            <Text size="xl" c="dimmed" ta="center">Caricamento...</Text>
        </motion.div>
    );
} 