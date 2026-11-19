import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon.tsx';

/** Lembar dari bawah (atau layar penuh). Menutup dengan ketuk latar, tombol ×, atau Esc. */
export function Sheet({ title, onClose, children, full, actions }: { title: string; onClose: () => void; children: ReactNode; full?: boolean; actions?: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim" onClick={onClose} />
      <div className={'sheet' + (full ? ' full' : '')}>
        <header className="sheet-head">
          <b>{title}</b>
          <span className="row">
            {actions}
            <button className="icon-btn" aria-label="Tutup" onClick={onClose}><Icon name="x" /></button>
          </span>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
