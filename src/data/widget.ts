import { Capacitor, registerPlugin } from '@capacitor/core';

interface NotedWidgetPlugin { refresh(): Promise<void> }
const Widget = registerPlugin<NotedWidgetPlugin>('NotedWidget');

// Widget
export async function refreshWidgets(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try { await Widget.refresh(); } catch {}
}
