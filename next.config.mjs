/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ['@mantine/core', '@mantine/hooks']
    },
    webpack: (config, options) => {
        config.module.rules.push({
            test: /\.lottie$/,
            type: "asset/resource",
        });

        return config;
    },
};

export default nextConfig;
