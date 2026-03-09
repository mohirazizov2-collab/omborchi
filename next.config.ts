
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // GitHub Pages uchun basePath va assetPrefix sozlamalari
  // Local preview (development) vaqtida root rejimida ishlashi uchun shartli tekshiruv
  basePath: process.env.NODE_ENV === 'production' ? '/omborchi' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/omborchi/' : '',
  
  // Statik sayt sifatida eksport qilish
  output: 'export',
  
  // GitHub Pages-da rasmlarni optimallashtirish serveri yo'qligi sababli
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  devIndicators: false, // Ekrandagi Next.js "N" belgisini o'chirish
};

export default nextConfig;
