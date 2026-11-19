// Dijalankan setelah `npx cap add android` / `cap sync`. Aman dipanggil berulang (idempoten).
import { existsSync, readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const android = join(root, 'android');
if (!existsSync(android)) { console.error('Folder android/ belum ada. Jalankan: npx cap add android'); process.exit(1); }

const read = (p) => readFileSync(p, 'utf8');
const pkg = JSON.parse(read(join(root, 'package.json')));

// 1) build.gradle: tanda tangan release + versionCode/versionName
const gradlePath = join(android, 'app', 'build.gradle');
let g = read(gradlePath);
if (!g.includes('// noted:signing')) {
  const signing = `
    // noted:signing
    signingConfigs {
        release {
            def ks = file("\${rootDir}/noted.keystore")
            if (ks.exists()) {
                storeFile ks
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
`;
  g = g.replace(/(\n\s*)buildTypes\s*\{/, `${signing}$1buildTypes {`);
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, `$1\n            if (file("\${rootDir}/noted.keystore").exists()) { signingConfig signingConfigs.release }`);
}
g = g.replace(/versionCode\s+\d+/, 'versionCode (System.getenv("VERSION_CODE") ?: "1").toInteger()');
g = g.replace(/versionName\s+"[^"]*"/, `versionName (System.getenv("VERSION_NAME") ?: "${pkg.version}")`);
writeFileSync(gradlePath, g);

// 2) AndroidManifest: izin notifikasi + alarm tepat waktu
const manPath = join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
let m = read(manPath);
for (const perm of ['android.permission.POST_NOTIFICATIONS', 'android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.RECEIVE_BOOT_COMPLETED']) {
  if (!m.includes(perm)) m = m.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
}
writeFileSync(manPath, m);

// 3) Ikon + ikon notifikasi
const res = join(root, 'native', 'android-res');
if (existsSync(res)) {
  cpSync(res, join(android, 'app', 'src', 'main', 'res'), { recursive: true });
} else {
  console.warn('native/android-res tidak ada: jalankan `node scripts/make-icons.mjs` untuk membuat ikon. Memakai ikon bawaan.');
}

// 4) Warna latar splash/ikon adaptif
const colors = join(android, 'app', 'src', 'main', 'res', 'values', 'ic_launcher_background.xml');
mkdirSync(join(android, 'app', 'src', 'main', 'res', 'values'), { recursive: true });
writeFileSync(colors, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#4F46E5</color>\n</resources>\n');

console.log('Android dipatch: tanda tangan, versi, izin, ikon.');
