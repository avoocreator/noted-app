import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { planSignature, type Planned } from '../lib/plan.ts';

export const isNative = () => Capacitor.isNativePlatform();

export type Perm = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function checkPermission(): Promise<Perm> {
  if (!isNative()) return 'unsupported';
  try {
    const r = await LocalNotifications.checkPermissions();
    return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt';
  } catch { return 'unsupported'; }
}

export async function requestPermission(): Promise<Perm> {
  if (!isNative()) return 'unsupported';
  try {
    const r = await LocalNotifications.requestPermissions();
    return r.display === 'granted' ? 'granted' : 'denied';
  } catch { return 'unsupported'; }
}

/** Android 12+: alarm tepat waktu butuh izin khusus. true = sudah boleh (atau tidak berlaku). */
export async function exactAlarmAllowed(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const ln = LocalNotifications as unknown as { checkExactNotificationSetting?: () => Promise<{ exact_alarm: string }> };
    if (!ln.checkExactNotificationSetting) return true;
    return (await ln.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch { return true; }
}

export async function openExactAlarmSettings(): Promise<void> {
  try {
    const ln = LocalNotifications as unknown as { changeExactNotificationSetting?: () => Promise<unknown> };
    await ln.changeExactNotificationSetting?.();
  } catch { /* pengguna membuka sendiri lewat pengaturan sistem */ }
}

let channelsReady = false;
async function ensureChannels() {
  if (channelsReady || !isNative()) return;
  try {
    await LocalNotifications.createChannel({ id: 'noted-tugas', name: 'Pengingat tugas', description: 'Tenggat dan pengingat sehari sebelumnya', importance: 4, visibility: 1, vibration: true });
    await LocalNotifications.createChannel({ id: 'noted-tas', name: 'Tas Besok', description: 'Ringkasan malam: pelajaran, yang dikumpul, dan yang dibawa besok', importance: 4, visibility: 1, vibration: true });
    channelsReady = true;
  } catch { /* plugin belum siap; dicoba lagi pada pemanggilan berikutnya */ }
}

let applied = '';
let busy: Promise<void> = Promise.resolve();

/** Ganti seluruh jadwal notifikasi dengan rencana terbaru. Dilewati bila rencana tidak berubah. */
export function applyPlan(plan: Planned[], force = false): Promise<void> {
  busy = busy.then(async () => {
    if (!isNative()) return;
    const sig = planSignature(plan);
    if (!force && sig === applied) return;
    try {
      await ensureChannels();
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      if (plan.length) {
        if ((await checkPermission()) !== 'granted') return; // tidak ada izin: jangan tandai "sudah diterapkan"
        await LocalNotifications.schedule({
          notifications: plan.map((p) => ({
            id: p.id,
            title: p.title,
            body: p.body,
            largeBody: p.largeBody,
            summaryText: p.largeBody ? 'Noted' : undefined,
            channelId: p.channel,
            schedule: { at: new Date(p.at), allowWhileIdle: true },
          })),
        });
      }
      applied = sig;
    } catch { /* dicoba lagi saat data berubah atau aplikasi dibuka */ }
  });
  return busy;
}

/** Notifikasi percobaan (5 detik lagi) supaya pengguna bisa memastikan izin dan suara berfungsi. */
export async function sendTest(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await ensureChannels();
    if ((await checkPermission()) !== 'granted' && (await requestPermission()) !== 'granted') return false;
    await LocalNotifications.schedule({ notifications: [{ id: 1999999999, title: 'Noted', body: 'Pengingat berfungsi. Besok pagi kamu aman ✓', channelId: 'noted-tugas', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] });
    return true;
  } catch { return false; }
}
