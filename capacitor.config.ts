import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clickearn.usdt',
  appName: 'ClickEarn',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // During development, you can point this to your local IP to see live changes
    // url: 'http://192.168.0.100:3000',
    cleartext: true
  }
};

export default config;
