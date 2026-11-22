# Uji ke pengguna (M7)

Tujuan: memastikan orang awam paham **tanpa dijelaskan**.

## Peserta
5 siswa + 3 guru. Beri APK, jangan jelaskan fitur apa pun. Amati, jangan membantu.

## Tugas (satu per satu, catat waktu & di mana mereka ragu)
1. Buka aplikasi. Tambahkan tugas "PR MTK hal 45 Jumat".
2. Bagikan satu pesan dari WhatsApp (pilih teks → Bagikan → Noted) dan periksa hasil uraian tugas di lembar tempel.
3. Isi jadwal untuk satu hari, lalu bagikan lewat QR Code.
4. Di HP lain (atau HP yang sama), pindai QR Code jadwal lewat kamera atau unggah gambar tangkapan layar dari galeri.
5. Buka Tas Besok. Apa yang harus dibawa besok?
6. Centang satu barang sampai muncul "Tas siap ✓".
7. Buat satu catatan dengan daftar centang.
8. Aktifkan pengingat. Kirim notifikasi percobaan.
9. Pasang widget *Tas Besok* di layar utama. Centang satu tugas langsung dari widget tanpa membuka aplikasi.

## Uji di HP sungguhan (wajib)
- [ ] Notifikasi tugas muncul tepat waktu saat layar mati (tunggu ≥ 10 menit).
- [ ] Notifikasi Tas Besok muncul malam hari.
- [ ] Setelah HP di-restart, pengingat tetap datang (buka aplikasi sekali bila tidak).
- [ ] Xiaomi/Oppo/Vivo: dengan penghemat baterai aktif, apakah pengingat telat? Catat merek & tipe.
- [ ] Android 12+: izin "Alarm & pengingat" diminta dan tombol di Pengaturan membukanya.
- [ ] Pasang versi baru di atas yang lama: data tetap ada.
- [ ] Cadangan → hapus aplikasi → pasang → pulihkan: data kembali.
- [ ] Tombol Kembali menutup lembar, lalu ke tab pertama, lalu keluar.
- [ ] Share Intent WA: pilih teks di WA → Bagikan ke Noted → aplikasi terbuka langsung membuka lembar tempel dengan teks terisi otomatis dan tugas terurai.
- [ ] Tukar Jadwal via QR:
  - Tampilkan QR code di Jadwal (SVG tajam bertema Noted).
  - Pindai via kamera bawaan (BarcodeDetector native) atau pilih gambar galeri.
  - Modal konfirmasi menampilkan ringkasan jadwal baru sebelum ditimpa.
- [ ] Widget Interaktif (Layar Utama):
  - Pasang widget *Tas Besok* dan *Hari ini*.
  - Ketuk tombol centang (target sentuh min 44dp): tugas tertandai selesai di latar belakang tanpa membuka aplikasi.
  - Widget langsung diperbarui instan (status "Tas siap ✓" muncul saat semua barang besok selesai).
  - Ketuk teks tugas pada baris widget: aplikasi Noted terbuka ke konteks tugas tersebut.
  - Buka aplikasi Noted setelah mencentang tugas di widget: data langsung sinkron dua arah seketika tanpa perlu memuat ulang aplikasi.
  - Cek setelah lewat tengah malam dan saat ukuran widget diubah (jumlah baris menyesuaikan).

## Ukuran keberhasilan
- ≥ 4 dari 5 siswa menyelesaikan tugas 1–5 tanpa bantuan.
- Siswa dapat berbagi jadwal lewat QR code dan menerima tugas dari WA tanpa perlu mengetik ulang manual.
- ≥ 3 siswa memakai Tas Besok lagi di hari berikutnya (tanya besoknya).
- Pengingat tidak terlewat di HP mana pun, atau penyebabnya jelas (pengaturan baterai).
- Tulis tiap kebingungan; jika dua orang bingung di tempat yang sama, perbaiki di sana.
