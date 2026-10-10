/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // I font delle slide vengono letti da disco: includerli nel bundle delle funzioni.
    outputFileTracingIncludes: { '/api/caroselli/**': ['./assets/fonts/**'] },
    // Screenshot per l'analisi profilo (già ridimensionati nel browser).
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
