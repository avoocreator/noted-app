import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.noted.mobile',
  appName: 'Noted',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_noted', iconColor: '#111111' } },
};
export default config;
