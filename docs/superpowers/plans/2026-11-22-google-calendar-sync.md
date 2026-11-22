# Google Calendar Integration (Local-First Offline Sync) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan integrasi Google Calendar opsional di Noted dengan arsitektur local-first (data disinkronkan saat online dan disimpan ke berkas JSON lokal sehingga 100% dapat dibaca saat offline), serta opsi ekspor tugas ke Google Calendar.

**Architecture:** Menggunakan Google Calendar API v3 via Google Identity Services Token Client pada sisi klien tanpa perantara server luar. Data acara yang ditarik dipetakan ke skema `GCalEvent[]` dan disimpan langsung di dalam `db.gcalEvents` berkas JSON lokal. Saat offline, aplikasi secara mandiri menampilkan data dari cache lokal tanpa jeda jaringan. Untuk pembuatan acara dari tugas, disediakan integrasi API langsung saat online dan fallback Web Intent Template URL saat offline/tanpa login.

**Tech Stack:** React 19, TypeScript, Zustand, Web Crypto / Google Identity Services, Node test runner (`node:test`).

**Spec:** Dokumen arsitektur ini disusun berdasarkan kebutuhan integrasi opsional dan penyimpanan lokal offline di Noted.

## Global Constraints
- Sifat fitur wajib **opsional (opt-in)**; pengguna yang tidak menghubungkan Google Calendar tidak terganggu performanya dan tidak melihat peringatan error.
- **Offline-first**: Semua data kalender yang pernah diambil wajib tersimpan di berkas JSON lokal HP dan bisa dibaca kapan saja tanpa koneksi internet.
- Tidak ada dependensi server backend tambahan; seluruh alur berjalan di klien.
- Gaya visual mengikuti bahasa desain Noted (retro paper, warm tones, pastel functional badges, tanpa elemen klise).

## Review Focus
1. Kondisi jaringan mati (`navigator.onLine === false`): fungsi sync harus keluar secara anggun tanpa melempar uncaught exception atau menampilkan toast error yang mengganggu.
2. Penanganan revisi data (`rev`): penyimpanan `gcalEvents` harus terintegrasi dengan mesin dua-slot penyimpanan lokal tanpa merusak revisi tugas sekolah yang sudah ada.
3. Struktur acara Google Calendar: acara sepanjang hari (*all-day*) dan acara dengan jam tertentu (*timed*) harus terurai dengan benar ke tanggal lokal HP (tanpa pergeseran zona waktu UTC).
4. Pemisahan tugas sekolah vs acara kalender eksternal: acara Google Calendar tidak boleh tertukar dengan tugas sekolah yang memiliki checklist tugas bawaan Noted.
5. Fallback Web Intent: saat pengguna ingin mengekspor tugas ke kalender tanpa login OAuth, URL template `calendar.google.com` harus ter-encode dengan aman.

---

## Tasks

### Task 1: Skema Model Data & Migrasi DB untuk Acara Kalender
**Files:**
- Modify: `src/lib/model.ts`
- Modify: `tests/app.test.ts` (atau buat `tests/gcal.test.ts`)

**Steps:**
- [x] Tulis unit test di `tests/gcal.test.ts` untuk memvalidasi fungsi `createDB()` dan `migrate()` yang menyertakan array `gcalEvents: []` dan konfigurasi `settings.gcalEnabled: false`.
- [x] Di `src/lib/model.ts`, definisikan interface `GCalEvent`:
  ```ts
  export interface GCalEvent {
    id: string;
    title: string;
    date: string;       // YYYY-MM-DD
    time?: string;      // HH:mm
    endTime?: string;   // HH:mm
    location?: string;
    allDay: boolean;
    htmlLink?: string;
    updatedAt: string;
  }
  ```
- [x] Perbarui `Settings` di `src/lib/model.ts` untuk menambahkan `gcalEnabled: boolean`, `gcalAutoSync: boolean`, dan `gcalLastSync?: string`.
- [x] Perbarui `DB` untuk menyertakan `gcalEvents: GCalEvent[]`.
- [x] Perbarui fungsi `createDB()` dan `migrate(raw)` untuk mengisi nilai bawaan yang aman.
- [x] Jalankan `npm test` dan pastikan semua tes lulus.

---

### Task 2: Modul Sinkronisasi & Parser Google Calendar
**Files:**
- Create: `src/lib/gcalParser.ts`
- Create: `src/data/gcal.ts`
- Test: `tests/gcal.test.ts`

**Steps:**
- [ ] Tulis unit test untuk parser event Google Calendar: memetakan objek event Google API (dengan format `start.dateTime` atau `start.date`) menjadi `GCalEvent` lokal, serta pengujian generator URL Web Intent `gcalTemplateUrl(task)`.
- [ ] Implementasikan parser murni di `src/lib/gcalParser.ts`:
  - Mengurai tanggal & jam lokal tanpa bug pergeseran zona waktu.
  - Menghasilkan URL template Google Calendar: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...`.
- [ ] Buat modul `src/data/gcal.ts`:
  - Fungsi `fetchGCalEvents(token: string)`: memanggil Google Calendar API v3 `GET /calendars/primary/events`.
  - Fungsi `syncGCalEvents(token: string)`: memeriksa status online (`navigator.onLine`), mengambil event, menyaring event yang valid, dan mengembalikan array `GCalEvent[]`.
- [ ] Jalankan `npm test` dan `npm run build` untuk memverifikasi fungsionalitas dan type safety.

---

### Task 3: Integrasi Pengaturan & Alur OAuth di Noted
**Files:**
- Modify: `src/screens/Settings.tsx`
- Modify: `src/data/store.ts`
- Modify: `src/styles.css`

**Steps:**
- [ ] Di `src/data/store.ts`, tambahkan action:
  - `setGCalEvents: (events: GCalEvent[]) => void`
  - `setGCalSettings: (p: Partial<Settings>) => void`
  - Tambahkan sinkronisasi otomatis di listener `appStateChange` / `online` jika `db.settings.gcalEnabled === true`.
- [ ] Di `src/screens/Settings.tsx`, tambahkan kartu pengaturan "Google Calendar (Opsional)":
  - Sakelar aktifkan Google Calendar.
  - Status koneksi (Terhubung / Belum terhubung) dan info terakhir sinkronisasi.
  - Tombol aksi "Sinkronkan Sekarang" yang mengeksekusi sinkronisasi saat online.
- [ ] Di `src/styles.css`, tambahkan gaya visual untuk kartu status Google Calendar yang senada dengan antarmuka Noted.
- [ ] Jalankan `npm run build` dan `npm test`.

---

### Task 4: Integrasi Tampilan di Layar (Minggu Ini & Tas Besok) dan Ekspor Tugas
**Files:**
- Modify: `src/screens/Week.tsx`
- Modify: `src/screens/Bag.tsx`
- Modify: `src/screens/TaskSheet.tsx`
- Modify: `src/styles.css`

**Steps:**
- [ ] Di `src/screens/Week.tsx`, tampilkan acara dari `db.gcalEvents` pada hari yang sesuai dengan badge khusus `[🗓️ Kalender]` yang membedakannya dari tugas manual.
- [ ] Di `src/screens/Bag.tsx`, tampilkan agenda kalender besok di bagian bawah mata pelajaran besok agar siswa tahu jika ada ujian atau agenda khusus dari Google Calendar.
- [ ] Di `src/screens/TaskSheet.tsx`, tambahkan tombol pintasan "Tambahkan ke Google Calendar" yang membuka template kalender atau melakukan sinkronisasi langsung.
- [ ] Jalankan `npm test` dan `npm run build` untuk memverifikasi hasil akhir.
