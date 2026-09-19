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

/**
 * Relais `/api/v1/*` → API, quand `API_INTERNAL_URL` est définie (déploiement).
 *
 * Le frontend et l'API sont alors servis depuis la MÊME origine : les cookies
 * `sameSite=strict` (refresh token, CSRF) sont bien envoyés, ce qui n'est pas le
 * cas entre deux sous-domaines `*.up.railway.app` (suffixe public = sites
 * distincts). En développement, la variable est absente et le frontend appelle
 * l'API directement via `NEXT_PUBLIC_API_URL`.
 *
 * Évalué au BUILD : changer `API_INTERNAL_URL` impose de reconstruire l'image.
 */
async function apiRewrites() {
  const target = process.env.API_INTERNAL_URL?.replace(/\/+$/, "");
  if (!target) return [];
  return [{ source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` }];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serveur autonome minimal pour l'image Docker (Railway, VPS).
  output: "standalone",
  rewrites: apiRewrites,
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
