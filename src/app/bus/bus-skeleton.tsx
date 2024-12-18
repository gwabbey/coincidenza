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
            style={{ maxWidth: 300, maxHeight: 300, margin: 'auto' }}
        >
            <DotLottieReact
                src="/bus.lottie"
                loop
                autoplay
                width={300}
                height={300}
            />
            <Text size="xl" c="dimmed" ta="center" fw="bold" mt={-30}>Caricamento...</Text>
        </motion.div>
    );
} 