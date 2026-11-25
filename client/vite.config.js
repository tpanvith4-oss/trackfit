import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** Fails native builds whose API URL can't work from a phone, and reports the one baked in. */
function checkNativeApiUrl(mode) {
  if (mode !== 'android' && mode !== 'ios') return;
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL?.trim();
  let url;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error(
      `VITE_API_BASE_URL is missing or invalid for the ${mode} build. Set it in client/.env.${mode} (or export it in CI).`,
    );
  }
  // Inside the APK/IPA, localhost is the device itself.
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(
      `VITE_API_BASE_URL=${apiUrl} points at the device itself. Use the Render URL (or a LAN/emulator host).`,
    );
  }
  console.info(`\n[${mode}] API base URL: ${url.origin}`);
  if (url.protocol !== 'https:') {
    console.warn(
      `[${mode}] The API is plain HTTP. Android may allow cleartext; iOS App Transport Security blocks it by default — use HTTPS for device installs.`,
    );
  }
}

export default defineConfig(({ mode }) => {
  checkNativeApiUrl(mode);
  return {
    plugins: [react(), tailwindcss()],
    // Relative asset paths are required when the bundle is served from the Capacitor WebView.
    base: './',
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      proxy: {
        '/api': 'http://localhost:4000',
        '/health': 'http://localhost:4000',
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
