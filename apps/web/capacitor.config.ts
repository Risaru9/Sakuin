import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sakuin.app',
  appName: 'Sakuin',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
