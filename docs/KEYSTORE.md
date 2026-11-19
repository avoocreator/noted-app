# Keystore & rilis APK

Android hanya mau memperbarui aplikasi kalau APK baru **ditandatangani dengan kunci yang sama** dengan yang terpasang. Tanpa kunci tetap, tiap build punya tanda tangan beda: pengguna harus uninstall dulu dan **datanya hilang**. Jadi buat keystore sekali, simpan selamanya.

## 1. Buat keystore (sekali saja)

```bash
keytool -genkeypair -v -keystore noted.keystore -alias noted -keyalg RSA -keysize 2048 -validity 10000
```

Isi password dan nama bebas. Ingat password dan alias-nya.

> **Cadangkan `noted.keystore` ke tempat aman (mis. flashdisk, password manager).** Kalau hilang, tidak ada cara memperbarui aplikasi di HP yang sudah terpasang. Jangan di-commit (sudah ada di `.gitignore`).

## 2. Ubah ke base64

Linux / macOS:
```bash
base64 -w0 noted.keystore > keystore.b64    # macOS: base64 -i noted.keystore > keystore.b64
```
Windows PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("noted.keystore")) | Set-Content keystore.b64
```

## 3. Simpan sebagai GitHub Secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Nama | Isi |
|---|---|
| `KEYSTORE_BASE64` | isi file `keystore.b64` |
| `KEYSTORE_PASSWORD` | password keystore |
| `KEY_ALIAS` | `noted` (atau alias yang kamu pilih) |
| `KEY_PASSWORD` | password kunci (sama dengan password keystore bila tidak dibedakan) |

Hapus `keystore.b64` setelahnya.

## 4. Rilis

```bash
git tag v0.1.0
git push --tags
```

Workflow **Release APK** berjalan, lalu APK `noted-v0.1.0.apk` muncul di halaman Releases. Pengguna cukup mengunduh dan memasang. Untuk versi berikutnya, tag baru (`v0.1.1`, …). `versionCode` otomatis naik dari nomor run GitHub.

Tanpa secrets, workflow tetap membuat APK **debug** (dengan peringatan) yang cukup untuk dites sendiri, tetapi tidak untuk dibagikan.
