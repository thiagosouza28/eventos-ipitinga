/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"]
  },
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    "/admin/**": ["public/index.html"],
    "/evento/**": ["public/index.html"]
  },
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(backendUrl)) {
      throw new Error("BACKEND_URL deve ser uma URL HTTP(S) absoluta.");
    }
    const legacyAdminRoutes = [
      "/admin/dashboard",
      "/admin/users",
      "/admin/profile",
      "/admin/profiles",
      "/admin/catalog",
      "/admin/districts",
      "/admin/churches",
      "/admin/ministries",
      "/admin/events/:path*",
      "/admin/registrations",
      "/admin/reports/:path*",
      "/admin/orders",
      "/admin/financial",
      "/admin/finance/:path*",
      "/admin/checkin/:path*",
      "/admin/inscritos-offline",
      "/admin/sorteios-equipes",
      "/admin/payments/pix"
    ];

    return {
      beforeFiles: legacyAdminRoutes.map((source) => ({
        source,
        destination: "/legacy-admin/index.html"
      })),
      afterFiles: [
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
        { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` }
      ]
    };
  }
};

export default nextConfig;
