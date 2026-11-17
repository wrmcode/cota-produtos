import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Upload de PDFs/imagens/planilhas para a importação assistida (/admin/importar).
    serverActions: { bodySizeLimit: "25mb" },
    // O proxy.ts lê o corpo antes da action e corta em 10 MB por padrão
    // ("Unexpected end of form"); precisa acompanhar o limite acima.
    proxyClientMaxBodySize: "25mb",
    // Toda a área logada é dinâmica (sessão + banco). Valida "navegação instantânea"
    // só em segmentos que exportarem `instant = true` explicitamente.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
