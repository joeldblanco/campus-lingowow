import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Reduce peak webpack memory during `next build` so the Vercel 8 GB build
    // container doesn't OOM (SIGKILL). Keeps the JS heap cap at 8192 — this
    // lowers webpack's actual working set rather than the allowed ceiling.
    webpackMemoryOptimizations: true,
  },
  // Esto evita errores de compilación con las dependencias de puppeteer en el servidor.
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // The webpack filesystem cache balloons to ~1.6 GB during `next build` and
    // is a primary driver of the Vercel 8 GB build-container OOM (SIGKILL).
    // Disable it for the production build — Vercel builds run cold, so the
    // persistent cache buys little while costing a lot of memory.
    if (config.cache) {
      config.cache = false
    }
    return config
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'joeldblanco',

  project: 'lingowow',

  // Disable Sentry telemetry
  telemetry: false,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  // Disabled to reduce memory usage during build (OOM fix)
  widenClientFileUpload: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
