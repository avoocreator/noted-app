import { dueLabel } from '../lib/dates.ts';
import type { Task } from '../lib/model.ts';
import { useStore } from '../data/store.ts';
import { Icon } from './Icon.tsx';

const KIND = { kumpul: 'Kumpul', bawa: 'Bawa', tugas: '' } as const;

export function TaskRow({ t, now, late }: { t: Task; now: Date; late?: boolean }) {
  const toggle = useStore((s) => s.toggleTask);
  const edit = useStore((s) => s.setEditTask);
  const kind = KIND[t.kind];
  return (
    <li className={'task' + (t.done ? ' done' : '') + (late ? ' late' : '')}>
      <button className={'check' + (t.done ? ' on' : '')} aria-label={t.done ? 'Batalkan selesai' : 'Tandai selesai'} aria-pressed={t.done} onClick={() => toggle(t.id)}>
        {t.done && <Icon name="check" size={16} strokeWidth={3} />}
      </button>
      <button className="task-main" onClick={() => edit(t.id)}>
        <span className="task-title">{t.title}</span>
        <span className="meta">
          {kind && <i className={'tag ' + t.kind}>{kind}</i>}
          {t.subject && <i className="tag subj">{t.subject}</i>}
          {t.due && <i className={'when' + (late ? ' late' : '')}><Icon name="calendar" size={12} /> {dueLabel(t.due, now)}{t.time ? ` · ${t.time}` : ''}</i>}
          {t.recur && <i className="when"><Icon name="repeat" size={12} /></i>}
          {t.priority === 'high' && <i className="when late"><Icon name="flag" size={12} /></i>}
        </span>
      </button>
    </li>
  );
}
