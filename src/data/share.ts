import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type ShareResult = 'shared' | 'copied' | 'cancelled';

/** Bagikan teks (kode kelas). Android: lembar berbagi; lainnya: salin ke papan klip. */
export async function shareText(text: string, title = 'Noted'): Promise<ShareResult> {
  try {
    if (Capacitor.isNativePlatform()) { await Share.share({ title, text, dialogTitle: title }); return 'shared'; }
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) { await nav.share({ title, text }); return 'shared'; }
  } catch { return 'cancelled'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'cancelled'; }
}

/** Simpan/bagikan berkas cadangan. Android: lewat lembar berbagi (simpan ke Drive, kirim ke WA, dst.). Web: unduh. */
export async function saveBackupFile(text: string, filename: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({ path: filename, directory: Directory.Cache, encoding: Encoding.UTF8, data: text });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: 'Cadangan Noted', url: uri, dialogTitle: 'Simpan cadangan Noted' });
      return true;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}
