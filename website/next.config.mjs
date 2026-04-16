/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // BACKEND_REWRITE_URL must use 127.0.0.1 (not localhost) to avoid IPv6
    // resolution delays on Windows — keep this as the default.
    const backendBase = process.env.BACKEND_REWRITE_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendBase}/api/v1/:path*`, // Proxy all API traffic to our backend
      },
    ];
  },
}

export default nextConfig;
