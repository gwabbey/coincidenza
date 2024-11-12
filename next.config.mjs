/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
        proxyTimeout: 10000
    },
};

export default nextConfig;
