import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'deckofcardsapi.com',
        pathname: '/static/img/**',
      },
      {
        protocol: 'https',
        hostname: 'yuoclpyteezlbckxckfo.supabase.co', // Your specific Supabase Host
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;