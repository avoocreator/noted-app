import type { Note } from './model.ts';
import { sameSubject } from './subjects.ts';

// Helpers
export const noteHeading = (n: Note): string => {
  if (n.title.trim()) return n.title.trim();
  const first = n.body.split('\n').map((l) => l.trim()).find(Boolean);
  return first ? first.slice(0, 60) : 'Tanpa judul';
};

export const snippet = (n: Note, max = 90): string => {
  const lines = n.body.split('\n').map((l) => l.trim()).filter(Boolean);
  const rest = n.title.trim() ? lines : lines.slice(1);
  const s = rest.join(' ');
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
};

// Filter
export function filterNotes(notes: Note[], q: string, subject?: string | null): Note[] {
  const needle = q.trim().toLowerCase();
  return notes
    .filter((n) => (!subject || sameSubject(n.subject, subject)) && (!needle || `${n.title}\n${n.body}\n${n.subject ?? ''}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const PREFIX = /^(\s*)(•\s|☐\s|☑\s|\d+\.\s)/;

// List helpers
export function continueList(line: string): string {
  const m = PREFIX.exec(line);
  if (!m) return '';
  const mark = m[2];
  if (line.slice(m[0].length).trim() === '') return '';
  if (mark.startsWith('☑')) return m[1] + '☐ ';
  const num = /^(\d+)\.\s/.exec(mark);
  return num ? `${m[1]}${Number(num[1]) + 1}. ` : m[1] + mark;
}

export function toggleLinePrefix(line: string, kind: 'bullet' | 'number' | 'check'): string {
  const target = kind === 'bullet' ? '• ' : kind === 'check' ? '☐ ' : '1. ';
  const m = PREFIX.exec(line);
  const body = m ? line.slice(m[0].length) : line;
  const indent = m ? m[1] : '';
  if (m && ((kind === 'bullet' && m[2] === '• ') || (kind === 'check' && (m[2] === '☐ ' || m[2] === '☑ ')) || (kind === 'number' && /^\d+\.\s$/.test(m[2])))) return indent + body;
  return indent + target + body;
}

export function flipCheck(line: string): string {
  if (line.includes('☐ ')) return line.replace('☐ ', '☑ ');
  if (line.includes('☑ ')) return line.replace('☑ ', '☐ ');
  return line;
}
