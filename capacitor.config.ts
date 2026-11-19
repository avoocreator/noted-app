import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.noted.mobile',
  appName: 'Noted',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_noted', iconColor: '#4F46E5' } },
};
export default config;
