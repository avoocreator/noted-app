import { Capacitor, registerPlugin } from '@capacitor/core';

interface NotedWidgetPlugin { refresh(): Promise<void> }
const Widget = registerPlugin<NotedWidgetPlugin>('NotedWidget');

/** Minta widget layar utama memuat ulang datanya (Android saja; di browser tidak melakukan apa-apa). */
export async function refreshWidgets(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try { await Widget.refresh(); } catch { /* plugin belum terdaftar: widget tetap diperbarui berkala */ }
}
