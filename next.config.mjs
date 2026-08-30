/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The widget iframe is embedded on third-party client sites,
  // so it must be allowed to be framed by any origin.
  async headers() {
    return [
      {
        source: "/widget/:path*",
        headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }],
      },
    ];
  },
};

export default nextConfig;
