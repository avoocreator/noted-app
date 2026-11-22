import os
from PIL import Image, ImageFilter

def process_icon():
    src_path = r'C:/Users/kira/.gemini/antigravity/brain/d12ace69-41e1-4612-8c38-f370ce549252/.user_uploaded/media_1795332202287_f9122a39.jpg'
    img = Image.open(src_path).convert('RGB')
    w, h = img.size

    # 1. Deteksi mask objek
    # Hitam background memiliki max(R,G,B) <= 12
    # Transisi edge: 10 .. 45
    pixels = img.load()
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out_pixels = out.load()

    low_th = 8
    high_th = 38

    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            # Kecerahan maksimal dari ketiga channel
            lum = max(r, g, b)
            if lum <= low_th:
                # Transparan murni
                out_pixels[x, y] = (0, 0, 0, 0)
            elif lum >= high_th:
                # Objek solid murni
                out_pixels[x, y] = (r, g, b, 255)
            else:
                # Anti-aliasing transisi: pulihkan warna murni objek tanpa halo hitam (unpremultiply)
                factor = (lum - low_th) / (high_th - low_th)
                alpha = int(factor * 255)
                # Skalakan kembali warna RGB agar tepi tidak gelap
                r_clean = min(255, int(r / max(factor, 0.05)))
                g_clean = min(255, int(g / max(factor, 0.05)))
                b_clean = min(255, int(b / max(factor, 0.05)))
                out_pixels[x, y] = (r_clean, g_clean, b_clean, alpha)

    # 2. Cari Bounding Box objek transparan
    bbox = out.getbbox()
    print('Clean bbox:', bbox)
    # Bbox: (min_x, min_y, max_x, max_y)
    obj_w = bbox[2] - bbox[0]
    obj_h = bbox[3] - bbox[1]
    center_x = (bbox[0] + bbox[2]) // 2
    center_y = (bbox[1] + bbox[3]) // 2

    # Berikan padding proporsional (sekitar 7% di setiap sisi) agar pas di kanvas persegi
    max_dim = max(obj_w, obj_h)
    target_size = int(max_dim * 1.15)
    
    # Hitung koordinat crop persegi seimbang
    half = target_size // 2
    crop_box = (
        max(0, center_x - half),
        max(0, center_y - half),
        min(w, center_x + half),
        min(h, center_y + half)
    )
    cropped = out.crop(crop_box)
    
    # Buat kanvas persegi murni dan letakkan di tengah
    square_canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    paste_x = (target_size - cropped.width) // 2
    paste_y = (target_size - cropped.height) // 2
    square_canvas.paste(cropped, (paste_x, paste_y), cropped)

    # 3. Simpan master resolusi tinggi (512x512)
    icon_512 = square_canvas.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save('public/favicon.png', format='PNG')
    icon_512.save('public/icon.png', format='PNG')
    print('Saved public/favicon.png & icon.png (512x512)')

    # Simpan favicon 32x32 dan 192x192
    icon_32 = square_canvas.resize((32, 32), Image.Resampling.LANCZOS)
    icon_32.save('public/favicon-32.png', format='PNG')
    icon_192 = square_canvas.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save('public/favicon-192.png', format='PNG')

    # Buat juga versi SVG wrapper yang meng-embed PNG data URL kualitas tinggi
    # agar browser yang meminta .svg tetap mendapatkan icon baru ini
    import base64
    from io import BytesIO
    buf = BytesIO()
    icon_512.save(buf, format='PNG')
    b64_png = base64.b64encode(buf.getvalue()).decode('utf-8')
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,{b64_png}" width="512" height="512" />
</svg>'''
    with open('public/favicon.svg', 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print('Saved public/favicon.svg (embedded high-res SVG wrapper)')

    # 4. Generate Android Mipmap Icons
    # Android Adaptive foreground & legacy icons
    sizes = { 'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192 }
    
    # Untuk adaptive foreground: Android butuh 108dp canvas dengan safe zone ~66-72dp di tengah
    # Kita buat foreground dari square_canvas dengan proporsi 68% dari kanvas 108dp
    for d, px in sizes.items():
        dir_path = os.path.join('native', 'android-res', f'mipmap-{d}')
        os.makedirs(dir_path, exist_ok=True)

        # Legacy icon (dengan background tema krem/ink atau rounded)
        # Background Noted #111111 dengan icon di dalamnya
        bg_card = Image.new('RGBA', (px, px), (0, 0, 0, 0))
        # Gambar legacy full icon
        legacy = square_canvas.resize((px, px), Image.Resampling.LANCZOS)
        legacy.save(os.path.join(dir_path, 'ic_launcher.png'), format='PNG')
        legacy.save(os.path.join(dir_path, 'ic_launcher_round.png'), format='PNG')

        # Adaptive Foreground (108dp base)
        fg_size = int(round(px * 108 / 48))
        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        # Letakkan icon di dalam safe zone (70% dari fg_size)
        inner_size = int(fg_size * 0.72)
        inner_icon = square_canvas.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (fg_size - inner_size) // 2
        fg_canvas.paste(inner_icon, (offset, offset), inner_icon)
        fg_canvas.save(os.path.join(dir_path, 'ic_launcher_foreground.png'), format='PNG')

    print('Android icons updated in native/android-res/!')

if __name__ == '__main__':
    process_icon()
