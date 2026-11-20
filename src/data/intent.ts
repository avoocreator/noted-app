import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface SharedTextPayload {
  text: string;
}

interface NotedWidgetPlugin {
  refresh(): Promise<void>;
  getPendingSharedText(): Promise<SharedTextPayload>;
  addListener(
    eventName: 'sharedTextReceived',
    listenerFunc: (data: SharedTextPayload) => void
  ): Promise<PluginListenerHandle>;
}

const Widget = registerPlugin<NotedWidgetPlugin>('NotedWidget');

let lastHandledText: string | null = null;
let lastHandledTime = 0;

function shouldHandle(text: string): boolean {
  const now = Date.now();
  if (lastHandledText === text && now - lastHandledTime < 1500) {
    return false;
  }
  lastHandledText = text;
  lastHandledTime = now;
  return true;
}

/**
 * Membaca teks kiriman yang tertunda dari intent native (cold start).
 * Mengembalikan string jika ada teks masuk, atau null jika tidak ada.
 */
export async function getPendingSharedText(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await Widget.getPendingSharedText();
    const text = res?.text?.trim();
    if (text && shouldHandle(text)) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Mendengarkan kiriman teks saat aplikasi sedang berjalan (warm start).
 * Mengembalikan fungsi cleanup untuk mencabut listener.
 */
export async function listenSharedText(handler: (text: string) => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  try {
    const handle = await Widget.addListener('sharedTextReceived', (data) => {
      const text = data?.text?.trim();
      if (text && shouldHandle(text)) {
        handler(text);
      }
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}

/**
 * Inisialisasi pendengar teks kiriman (share intent).
 * Mengambil teks tertunda saat aplikasi dibuka (cold start),
 * dan mendengarkan kiriman teks saat aplikasi sedang berjalan (warm start).
 */
export async function initIntentListener(onReceived: (text: string) => void): Promise<() => void> {
  const cleanupPromise = listenSharedText(onReceived);
  const pending = await getPendingSharedText();
  if (pending) {
    onReceived(pending);
  }
  return async () => {
    const cleanup = await cleanupPromise;
    cleanup();
  };
}
