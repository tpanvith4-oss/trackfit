import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** Fails Android builds whose API URL can't work from a phone, and reports the one baked in. */
function checkAndroidApiUrl(mode) {
  if (mode !== 'android') return;
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL?.trim();
  let url;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error('VITE_API_BASE_URL is missing or invalid for the Android build. Set it in client/.env.android.');
  }
  // Inside the APK, localhost is the phone itself.
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(`VITE_API_BASE_URL=${apiUrl} points at the phone itself. Use the Render URL (or 10.0.2.2 for the emulator).`);
  }
  console.info(`\n[android] API base URL: ${url.origin}`);
  if (url.protocol !== 'https:') {
    console.warn('[android] The API is plain HTTP: fine for a local test server, but use HTTPS for a real install.');
  }
}

export default defineConfig(({ mode }) => {
  checkAndroidApiUrl(mode);
  return {
    plugins: [react(), tailwindcss()],
    // Relative asset paths are required when the bundle is served from the Capacitor WebView.
    base: './',
    server: {
      host: true,
      port: 5173,
      strictPort: true,
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
