import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App iOS/Android con Capacitor sulla stessa API del sito: la web app (PWA) viene incapsulata,
 * con notifiche push native e icona in home. Passi: `npm i -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android`,
 * poi `npx cap init "ASTER News" it.asternews.app --web-dir=mobile/www`, `npx cap add ios`, `npx cap add android`, `npx cap open ios`.
 * In `mobile/www/index.html` basta un redirect a `server.url` (sotto), così l'app carica sempre l'ultima versione pubblicata.
 */
const config: CapacitorConfig = {
  appId: 'it.asternews.app',
  appName: 'ASTER News',
  webDir: 'mobile/www',
  server: { url: 'https://asternewscms.vercel.app', cleartext: false },
  plugins: { PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] }, SplashScreen: { launchAutoHide: true, backgroundColor: '#22418f' } },
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false },
};
export default config;
