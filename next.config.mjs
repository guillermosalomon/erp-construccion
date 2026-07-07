/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
  
  async rewrites() {
    return [
      {
        source: '/ia-cripto',
        destination: 'https://ia-cripto-web.vercel.app',
      },
      {
        source: '/ia-cripto/:path*',
        destination: 'https://ia-cripto-web.vercel.app/:path*',
      },
    ];
  },
  
  // Webpack fallback for compatibility
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('web-ifc');
    }

    return config;
  },
};

export default nextConfig;
