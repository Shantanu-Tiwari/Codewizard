/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    domains: ["quaint-buzzard-426.convex.cloud"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lovely-flamingo-139.convex.cloud'
      },
      {
        protocol: 'https',
        hostname: 'sleek-capybara-771.convex.cloud'
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com'
      },
    ]
  }
};

export default nextConfig;
