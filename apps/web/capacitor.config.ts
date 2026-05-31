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
  },
  android: {
    // Override User Agent to look like standard mobile Chrome to bypass Google OAuth WebView block
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36'
  },
  ios: {
    // Override User Agent to look like standard mobile Safari to bypass Google OAuth WebView block
    overrideUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1090124544185-jqgvut63n2hg4rhf341eohvg7i7fnp32.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;
