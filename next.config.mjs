import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    root: __dirname,
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
