import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias||{}), '@': path.resolve(__dirname, 'src') };
    return config;
  },
};
export default nextConfig;
