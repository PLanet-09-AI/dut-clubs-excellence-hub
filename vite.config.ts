import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        strategies: "generateSW",
        manifest: false,
        manifestFilename: "manifest.webmanifest",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/\.netlify\//, /^\/api\//],
          // Exclude Firestore and Firebase Auth WebChannel URLs from SW interception
          navigateFallbackAllowlist: [/^(?!\/(api|\.netlify))/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "firebase-storage",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Exclude Firestore/Firebase APIs from caching — they use streaming/WebChannel
              urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
              handler: "NetworkOnly",
            },
            {
              urlPattern: /^https:\/\/.*/,
              handler: "NetworkFirst",
              options: {
                cacheName: "external-resources",
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false, type: "module" },
      }),
    ],
    // Vitest configuration
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup.ts"],
      include: ["src/__tests__/**/*.{test,spec}.ts", "src/__tests__/**/*.{test,spec}.tsx"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/data/**", "src/lib/**"],
      },
    },
  },
});

