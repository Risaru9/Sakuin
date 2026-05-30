import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sakuin.app',
  appName: 'Sakuin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Load from production Vercel URL so the WebView origin matches the
    // whitelisted CORS origin and Google OAuth works without restrictions.
    url: 'https://sakuin-web.vercel.app',
    cleartext: false
  }
};

export default config;
