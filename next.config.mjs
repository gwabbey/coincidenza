/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.lefrecce.it',
                port: '',
                pathname: '/Channels.Website.WEB/web/images/logo/**',
                search: '',
            },
        ],
    },
};

export default nextConfig;
