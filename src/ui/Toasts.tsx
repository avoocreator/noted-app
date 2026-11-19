import { useStore } from '../data/store.ts';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.undo && <button onClick={() => { t.undo?.(); dismiss(t.id); }}>Urungkan</button>}
        </div>
      ))}
    </div>
  );
}
