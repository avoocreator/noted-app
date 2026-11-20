# Roadmap Pelaksanaan Noted (11 Fase)

Dokumen ini adalah panduan pelaksanaan otomatis untuk 11 fase milestone Noted. Setiap sesi otomasi membaca status saat ini dari `docs/ROADMAP_PROGRESS.json`, mengeksekusi 1 fase berikutnya, menjalankan pengujian, memperbarui status, dan membuat 1 commit.

---

### Fase 1: Android Intent Filter & Manifest
- **Tujuan:** Daftarkan intent filter untuk menerima teks dari WhatsApp/aplikasi lain.
- **Langkah:**
  1. Buka `scripts/apply-android.mjs`.
  2. Tambahkan `<intent-filter>` action `android.intent.action.SEND` dengan `android:mimeType="text/plain"` pada `MainActivity`.
  3. Pastikan `launchMode` activity diset ke `singleTask`.
  4. Jalankan `node scripts/apply-android.mjs` (atau verifikasi fungsi script jika folder android belum ada).
- **Commit:** `feat(android): add SEND intent filter for WhatsApp text sharing`

---

### Fase 2: Native Capacitor Bridge untuk Intent
- **Tujuan:** Tangkap teks kiriman pada Android (cold/warm start) dan ekspos ke TypeScript.
- **Langkah:**
  1. Buka `native/android-src/java/app/noted/mobile/MainActivity.java` dan tangkap `EXTRA_TEXT` pada `onCreate` & `onNewIntent`.
  2. Tambahkan metode `getPendingSharedText` dan event emitter di `NotedWidgetPlugin.java`.
  3. Buat file `src/data/intent.ts` sebagai wrapper Capacitor untuk membaca teks masuk.
  4. Jalankan `npm run typecheck`.
- **Commit:** `feat(android): add native bridge to receive shared text from intent`

---

### Fase 3: Auto-Fill & Parsing di PasteSheet
- **Tujuan:** Buka otomatis lembar tempel WA saat teks dibagikan.
- **Langkah:**
  1. Sambungkan listener `intent.ts` ke `src/data/store.ts` agar mengisi state `incomingText` dan menyetel `pasteOpen: true`.
  2. Di `src/screens/PasteSheet.tsx`, jika ada teks masuk, otomatis jalankan `parseWaPaste()`.
  3. Tampilkan badge hijau kecil "Diterima dari WhatsApp".
  4. Tambahkan peringatan jika tugas duplikat sudah ada di `db.tasks`.
  5. Jalankan `npm test` dan `npm run build`.
- **Commit:** `feat(ui): auto-fill and parse incoming shared WhatsApp text in PasteSheet`

---

### Fase 4: Modul Generator QR Code SVG Lokal
- **Tujuan:** Generator matriks QR Code murni di klien tanpa dependensi native berat.
- **Langkah:**
  1. Buat `src/lib/qr.ts` yang meng-encode payload string `NOTED1-...` menjadi matriks dan SVG string.
  2. Styling SVG dengan warna retro Noted: modul kotak `--ink` (#111111) berlatar `--card` (#fffbf0).
  3. Buat unit test `tests/qr.test.ts` untuk memverifikasi QR SVG terbentuk valid.
  4. Jalankan `npm test`.
- **Commit:** `feat(qr): add lightweight client-side QR code SVG generator`

---

### Fase 5: Modal Tampilan QR di Jadwal
- **Tujuan:** Antarmuka pop-up untuk menampilkan QR jadwal ke teman sekelas.
- **Langkah:**
  1. Buat komponen `src/ui/QrModal.tsx` dengan kartu pop-up krem hangat, SVG QR, tombol Tutup, dan tombol Salin Kode Teks.
  2. Tambahkan tombol pil `[ Tampilkan QR ]` di `src/screens/ScheduleEditor.tsx`.
  3. Jalankan `npm run typecheck` dan `npm run build`.
- **Commit:** `feat(ui): add QR code display modal in ScheduleEditor`

---

### Fase 6: Scanner Kamera via Native BarcodeDetector API
- **Tujuan:** Pindai QR Code jadwal menggunakan kamera HP.
- **Langkah:**
  1. Buat komponen `src/ui/ScannerModal.tsx` menggunakan `navigator.mediaDevices.getUserMedia` dan `window.BarcodeDetector`.
  2. Pasang viewport bidik dengan bingkai pastel retro.
  3. Pastikan `track.stop()` dipanggil saat modal ditutup agar kamera tidak menyala terus.
  4. Jalankan `npm run typecheck`.
- **Commit:** `feat(qr): implement camera QR scanner using BarcodeDetector API`

---

### Fase 7: Fallback Scan Galeri & Konfirmasi Jadwal
- **Tujuan:** Fallback upload screenshot QR dan dialog konfirmasi sebelum jadwal diganti.
- **Langkah:**
  1. Tambahkan opsi "Pilih gambar dari galeri" di `ScannerModal.tsx` dengan canvas decoder.
  2. Validasi payload `NOTED1-...`, tolak jika bukan kode Noted.
  3. Tampilkan dialog pratinjau jadwal baru (jumlah mapel per hari) sebelum menimpa jadwal lama.
  4. Pasang tombol pil `[ Pindai QR ]` di `ScheduleEditor.tsx`.
  5. Jalankan `npm test` dan `npm run build`.
- **Commit:** `feat(ui): add gallery scan fallback and schedule replacement preview`

---

### Fase 8: Mesin Tulis Dua-Slot JSON Atomik di Java
- **Tujuan:** Mutasi status tugas langsung di berkas penyimpanan lokal Android.
- **Langkah:**
  1. Di `native/android-src/java/app/noted/mobile/NotedData.java`, buat fungsi `public static synchronized boolean toggleTask(Context c, String taskId)`.
  2. Baca slot aktif dengan rev tertinggi, ubah `done` dan `doneAt`, naikkan `rev = rev + 1`, tulis atomik ke slot pasangannya (`noted-0`/`noted-1`).
  3. Verifikasi konsistensi struktur schema dengan `model.ts`.
- **Commit:** `feat(android): implement atomic two-slot JSON task toggling in native Java`

---

### Fase 9: BroadcastReceiver & Split Touch Target Widget
- **Tujuan:** Tombol centang di widget home screen memicu toggle latar belakang tanpa membuka aplikasi.
- **Langkah:**
  1. Buat `native/android-src/java/app/noted/mobile/WidgetActionReceiver.java` untuk menangani action `ACTION_TOGGLE_TASK`.
  2. Di `native/android-res/layout/widget_bag.xml` & `widget_today.xml`, pisahkan container baris tugas menjadi target sentuh centang (checkbox min 44dp) dan target sentuh teks.
  3. Di `WidgetBase.java`, pasang `PendingIntent.getBroadcast` untuk icon centang dan `PendingIntent.getActivity` untuk teks.
  4. Daftarkan receiver di `scripts/apply-android.mjs`.
- **Commit:** `feat(android): add WidgetActionReceiver and split touch targets in widget layouts`

---

### Fase 10: Pembaruan Widget Instan & Sinkronisasi Balik
- **Tujuan:** Visual widget langsung update dan webview otomatis reload data saat dibuka kembali.
- **Langkah:**
  1. Di `WidgetActionReceiver.java`, panggil `WidgetUpdater.updateAll(context)` seketika setelah toggle.
  2. Di `BagWidget.java`, pastikan status "Tas siap ✓" terupdate real-time saat semua barang dicentang.
  3. Di `src/App.tsx`, tambahkan listener `appStateChange` agar saat aplikasi kembali ke foreground, memanggil `loadDB()` untuk memuat revisi terbaru.
  4. Jalankan `npm test` dan `npm run build`.
- **Commit:** `feat(android): instant widget update on toggle and bidirectional app state sync`

---

### Fase 11: Uji End-to-End & Pembaruan Panduan Uji
- **Tujuan:** Verifikasi penuh seluruh alur dan perbarui dokumentasi pengujian.
- **Langkah:**
  1. Jalankan `npm test` (pastikan 100% tes unit lulus).
  2. Jalankan `npm run build` (type-check dan bundle Vite).
  3. Perbarui `docs/UJI.md` dengan skenario uji baru: WA share, scan QR, dan interactive widget.
  4. Perbarui `README.md` pada bagian status fitur.
- **Commit:** `docs: update usability testing guide and mark features 1-3 complete`
