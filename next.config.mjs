/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
  
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
