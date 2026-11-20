# Noted

Aplikasi Android untuk sekolah: **tugas + pengingat + catatan sederhana**, dengan fitur khas **Tas Besok**: tiap malam, apa yang harus dikumpul dan dibawa besok, dihitung dari jadwal pelajaran dan tugasmu.

> Semua tugas dari WA dan kelas ada di satu tempat, urut tenggat, dan Noted mengingatkanmu.

Tanpa akun, tanpa server. Data ada di HP dalam satu berkas JSON.

## Fitur
- **Minggu ini**: tugas dikelompokkan (terlambat, hari ini, besok, minggu ini, nanti). Tambah cepat: `PR MTK hal 45 jumat !penting`, `bawa kalkulator besok`, `kumpul laporan IPA pertemuan berikutnya`.
- **Tempel dari WA**: tempel pesan grup, Noted mengambil tenggat dan mapel, kamu periksa lalu tambah.
- **Pengingat**: notifikasi lokal pada jam tugas, H-1, dan Tas Besok.
- **Tas Besok**: daftar kumpul/bawa untuk besok, centang sampai "Tas siap ✓".
- **Jadwal pelajaran** manual, bisa dibagikan sebagai **kode kelas** (teks `NOTED1-…`).
- **Widget layar utama** (Android): *Tas Besok* (pelajaran besok + barang bawa/kumpul, "Tas siap ✓") dan *Hari ini* (tugas jatuh tempo + terlambat). Ketuk widget untuk membuka Noted; tahan layar utama → Widget → Noted.
- **Catatan** sederhana (poin, nomor, daftar centang).
- **Cadangan** JSON.

## Menjalankan
```bash
npm install
npm test            # tes logika (node --test)
npm run dev         # di browser
npm run build       # type-check + build web
```

## Android
```bash
npm run build
npx cap add android         # sekali saja
npm run cap:sync            # build + sync + patch (izin, versi, ikon, tanda tangan)
npm run android:open        # buka Android Studio, atau:
cd android && ./gradlew assembleDebug
```
Rilis lewat GitHub Actions: lihat [docs/KEYSTORE.md](docs/KEYSTORE.md). Daftar uji: [docs/UJI.md](docs/UJI.md).

## Struktur
```
src/lib/      logika murni (tanggal, parser, WA, jadwal, Tas Besok, rencana notifikasi, cadangan, kode kelas) + tes
src/data/     penyimpanan, notifikasi, berbagi, store zustand
src/ui/       komponen bersama
src/screens/  layar
scripts/      patch Android, pembuat ikon
native/       ikon, drawable, layout & kode Java widget Android
```

## Catatan jujur
- Kode ini **belum pernah dibangun dan dijalankan di perangkat**; hanya logika di `src/lib` yang dites otomatis. Ekspektasikan beberapa perbaikan kecil saat build pertama.
- Keandalan pengingat di Xiaomi/Oppo/Vivo dan izin alarm tepat waktu (Android 12+) belum diuji.
- Widget ditulis dalam Java native (`native/android-src`) dan **belum pernah dikompilasi**; diperbarui tiap data disimpan, tiap ganti hari, dan tiap 30 menit. Bila `MainActivity.java` tidak terpatch otomatis, tambahkan `registerPlugin(NotedWidgetPlugin.class);` sebelum `super.onCreate(...)`.
- Belum ada suara alarm kustom (hanya suara notifikasi bawaan sistem).
- Catatan hanya teks polos dengan poin/nomor/centang.
- Kode kelas hanya teks, belum ada QR.
- Di browser, pengingat tidak berbunyi saat tab ditutup.
- Data hilang bila aplikasi di-uninstall; gunakan Cadangan.
