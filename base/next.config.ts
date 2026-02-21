import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/appointments", destination: "/dashboard/appointments", permanent: true },
      { source: "/settings", destination: "/dashboard/settings", permanent: true },
      { source: "/get-care", destination: "/dashboard/get-care", permanent: true },
      { source: "/providers", destination: "/dashboard/providers", permanent: true },
      { source: "/providers/specialties", destination: "/dashboard/providers/specialties", permanent: true },
      { source: "/providers/:id", destination: "/dashboard/providers/:id", permanent: true },
      { source: "/quick-booking", destination: "/dashboard/get-care", permanent: true },
    ];
  },
};

export default nextConfig;
