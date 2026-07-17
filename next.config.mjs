/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Windows: force single-threaded page-data collection to avoid a flaky
  // worker filesystem race ("Cannot find module for page") during `next build`.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
