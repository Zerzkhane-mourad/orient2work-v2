/**
 * Autorise l'optimiseur d'images de Next à charger depuis l'API.
 *
 * Les couvertures de formation sont servies par l'API (`/formations/:id/image`),
 * qui vit sur une autre origine que le frontend — sans cette entrée, `next/image`
 * refuse la source. L'origine est lue dans `NEXT_PUBLIC_API_URL` plutôt que codée
 * en dur : elle change entre le développement et la production.
 */
function apiRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return [];

  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
      },
    ];
  } catch {
    // URL invalide : on laisse la validation d'environnement du client la signaler.
    return [];
  }
}

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
      ...apiRemotePattern(),
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
