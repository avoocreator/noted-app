import { useEffect } from 'react';
import { DAYS_ID } from '../lib/dates.ts';
import { type Schedule } from '../lib/model.ts';
import { hasSchedule, SCHOOL_DAYS } from '../lib/schedule.ts';
import { Icon } from './Icon.tsx';

export interface SchedulePreviewModalProps {
  newSchedule: Schedule;
  currentSchedule: Schedule;
  onConfirm: () => void;
  onClose: () => void;
}

export function SchedulePreviewModal({
  newSchedule,
  currentSchedule,
  onConfirm,
  onClose,
}: SchedulePreviewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isReplacing = hasSchedule(currentSchedule);
  const totalNewSubjects = SCHOOL_DAYS.reduce(
    (sum, d) => sum + (newSchedule[d]?.length ?? 0),
    0
  );

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Pratinjau Jadwal Baru">
      <div className="scrim" onClick={onClose} />
      <div className="modal-card">
        <header className="sheet-head">
          <b>Pratinjau Jadwal Baru</b>
          <button className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        {isReplacing && (
          <div className="warn" style={{ width: '100%', textAlign: 'left', fontSize: '.86rem' }}>
            ⚠️ <b>Jadwal saat ini akan ditimpa</b> dengan jadwal baru berikut:
          </div>
        )}

        <p className="muted small" style={{ width: '100%', textAlign: 'left' }}>
          Ditemukan <b>{totalNewSubjects} jam mapel</b> sepanjang pekan:
        </p>

        <div className="preview-list">
          {SCHOOL_DAYS.map((d) => {
            const list = newSchedule[d] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={d} className="preview-day-row">
                <div className="preview-day-head">
                  <b>{DAYS_ID[d]}</b>
                  <span>{list.length} mapel</span>
                </div>
                <div className="preview-day-subs">{list.join(', ')}</div>
              </div>
            );
          })}
          {totalNewSubjects === 0 && (
            <p className="muted small center" style={{ padding: '16px 0' }}>
              Tidak ada mapel terdaftar dalam jadwal ini.
            </p>
          )}
        </div>

        <div className="row wrap gap center" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
          <button className="btn soft" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" onClick={onConfirm}>
            <Icon name="check" size={18} /> Terapkan Jadwal
          </button>
        </div>
      </div>
    </div>
  );
}
