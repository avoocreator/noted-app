import { useEffect, useMemo } from 'react';
import { encodeQrSvg } from '../lib/qr.ts';
import { shareText } from '../data/share.ts';
import { useStore } from '../data/store.ts';
import { Icon } from './Icon.tsx';

export function QrModal({
  title,
  code,
  onClose,
}: {
  title: string;
  code: string;
  onClose: () => void;
}) {
  const toast = useStore((s) => s.toast);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const svg = useMemo(() => {
    try {
      return encodeQrSvg(code, {
        size: 240,
        border: 2,
        fgColor: '#111111',
        bgColor: '#ffffff',
      });
    } catch {
      return '';
    }
  }, [code]);

  const copy = async () => {
    const res = await shareText(code, title);
    if (res === 'copied') toast('Kode berhasil disalin');
    else if (res === 'shared') toast('Kode dibagikan');
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim" onClick={onClose} />
      <div className="modal-card">
        <header className="sheet-head">
          <b>{title}</b>
          <button className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        {svg ? (
          <div className="qr-frame" aria-label="QR Code Jadwal" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="danger small">Gagal menghasilkan QR code</p>
        )}

        <p className="muted small">
          Arahkan kamera teman ke QR code ini untuk menyalin jadwal pelajaran secara langsung tanpa internet.
        </p>

        <div className="row wrap gap center" style={{ width: '100%', justifyContent: 'center' }}>
          <button className="btn soft" onClick={() => void copy()}>
            <Icon name="share" size={18} /> Salin kode teks
          </button>
          <button className="btn primary" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
