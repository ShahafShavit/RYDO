import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.rydo.app',
  appName: 'RYDO',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    // https://localhost for bundled assets; cleartext for API calls to http://10.0.2.2:5000
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SafeArea: {
      statusBarStyle: 'DARK',
      navigationBarStyle: 'DARK',
      initialViewportFitCover: true,
      detectViewportFitCoverChanges: true,
    },
  },
};

export default config;
