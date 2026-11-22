# Noted

Aplikasi Android untuk sekolah: **tugas + pengingat + catatan sederhana**, dengan fitur khas **Tas Besok**: tiap malam, apa yang harus dikumpul dan dibawa besok, dihitung dari jadwal pelajaran dan tugasmu.

> Semua tugas dari WA dan kelas ada di satu tempat, urut tenggat, dan Noted mengingatkanmu.

Tanpa akun, tanpa server. Data ada di HP dalam satu berkas JSON.

## Fitur
- **Minggu ini**: tugas dikelompokkan (terlambat, hari ini, besok, minggu ini, nanti). Tambah cepat: `PR MTK hal 45 jumat !penting`, `bawa kalkulator besok`, `kumpul laporan IPA pertemuan berikutnya`.
- **Tempel & Berbagi dari WA**: tempel pesan grup atau bagikan langsung lewat menu *Share* Android ke Noted; Noted mengurai tenggat dan mapel otomatis sebelum disimpan.
- **Pengingat**: notifikasi lokal pada jam tugas, H-1, dan Tas Besok.
- **Tas Besok**: daftar kumpul/bawa untuk besok, centang sampai "Tas siap ✓".
- **Jadwal pelajaran & Tukar QR**: jadwal pelajaran fleksibel, bisa dibagikan lewat kode teks (`NOTED1-…`) atau kode QR grafis. Pemindaian mendukung kamera langsung dan unggah gambar dari galeri dengan pratinjau sebelum mengganti jadwal.
- **Widget layar utama interaktif** (Android): *Tas Besok* (pelajaran besok + barang bawa/kumpul, "Tas siap ✓") dan *Hari ini* (tugas jatuh tempo + terlambat). Dilengkapi tombol centang langsung di home screen tanpa membuka aplikasi, serta sinkronisasi dua arah otomatis ke aplikasi.
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
- Kode ini dioptimalkan untuk perangkat fisik Android; logika diuji otomatis via unit test.
- Keandalan pengingat di Xiaomi/Oppo/Vivo dan izin alarm tepat waktu (Android 12+) memerlukan izin "Alarm & pengingat" di Pengaturan sistem.
- Widget ditulis dalam Java native (`native/android-src`) dengan target sentuh terpisah (centang langsung di background & tap teks untuk membuka aplikasi) dan sinkronisasi berkas dua-slot JSON atomik.
- Belum ada suara alarm kustom (hanya suara notifikasi bawaan sistem).
- Catatan fokus pada teks polos dengan poin/nomor/centang cepat.
- Di browser, pengingat tidak berbunyi saat tab ditutup.
- Data disimpan lokal di HP; gunakan menu Cadangan secara berkala.
