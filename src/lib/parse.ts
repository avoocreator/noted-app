import { addDays, addMonths, nextWeekday, pad, parseYmd, startOfDay, ymd } from './dates.ts';
import type { Priority, Recur, Schedule, TaskKind } from './model.ts';
import { nextMeeting } from './schedule.ts';
import { canonicalSubject, findSubjectInText } from './subjects.ts';

export interface Parsed {
  title: string;
  due?: string;
  time?: string;
  subject?: string;
  kind: TaskKind;
  priority?: Priority;
  recur?: Recur;
  /** teks menyebut "pertemuan berikutnya" */
  meeting?: boolean;
}

export interface ParseCtx {
  now?: Date;
  schedule?: Schedule;
  /** mapel yang sudah dikenal (jadwal + tugas sebelumnya) */
  subjects?: string[];
}

const MONTHS: Record<string, number> = {
  jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2, apr: 3, april: 3, mei: 4, jun: 5, juni: 5,
  jul: 6, juli: 6, agu: 7, agt: 7, agustus: 7, sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10, des: 11, desember: 11,
};
const WEEKDAYS: Record<string, number> = { minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };

const SUBMIT = /\b(kumpul|kumpulkan|dikumpul|dikumpulkan|mengumpul|mengumpulkan|pengumpulan|submit|setor|disetor)\b/i;
const BRING = /\b(bawa|membawa|dibawa|bawaan)\b/i;

function take(src: string, re: RegExp): { rest: string; m: RegExpExecArray | null } {
  const m = re.exec(src);
  if (!m) return { rest: src, m: null };
  return { rest: src.slice(0, m.index) + ' ' + src.slice(m.index + m[0].length), m };
}

const TRAILING = /(?:\s+(?:dikumpul(?:kan)?|kumpul(?:kan)?|deadline|tenggat|paling\s+lambat|pada|hari|sampai|s\/d|sd|untuk|di|pd|tgl|tanggal|jam|pukul|pkl|yaitu|ya))+$/i;
const LEADING = /^(?:hari|pada|untuk)\s+/i;

/**
 * Pahami kalimat bebas bahasa Indonesia:
 * "PR matematika hal 45 dikumpul jumat jam 7 !penting" → judul, tenggat, jam, mapel, jenis (tugas/kumpul/bawa).
 */
export function parseTask(input: string, ctx: ParseCtx = {}): Parsed {
  const now = ctx.now ?? new Date();
  const today = startOfDay(now);
  const known = ctx.subjects ?? [];
  let s = ' ' + input.trim() + ' ';
  const out: Parsed = { title: '', kind: 'tugas' };

  out.kind = SUBMIT.test(input) ? 'kumpul' : BRING.test(input) ? 'bawa' : 'tugas';

  // prioritas
  let r = take(s, /\s!(penting|tinggi|high|p1|urgent)\b/i);
  if (r.m) { out.priority = 'high'; s = r.rest; }
  else if ((r = take(s, /\s!(sedang|medium|p2)\b/i)).m) { out.priority = 'medium'; s = r.rest; }
  else if ((r = take(s, /\s!(rendah|low|p3)\b/i)).m) { out.priority = 'low'; s = r.rest; }

  // pengulangan
  r = take(s, /\s(?:tiap|setiap)\s+(hari|minggu|pekan|bulan)\b/i);
  if (r.m) {
    const w = r.m[1].toLowerCase();
    out.recur = w === 'hari' ? 'day' : w === 'bulan' ? 'month' : 'week';
    s = r.rest;
  }

  // mapel lewat #tag
  r = take(s, /\s#([\p{L}\p{N}_-]+)/u);
  let tagSubject: string | undefined;
  if (r.m) { tagSubject = canonicalSubject(r.m[1].replace(/_/g, ' '), known); s = r.rest; }

  // jam
  r = take(s, /\s(?:jam|pukul|pkl)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?\b/i);
  if (!r.m) r = take(s, /\s(\d{1,2}):(\d{2})\s*(pagi|siang|sore|malam)?(?=\s)/i);
  if (r.m) {
    let h = Number(r.m[1]);
    const mi = r.m[2] ? Number(r.m[2]) : 0;
    const suf = (r.m[3] ?? '').toLowerCase();
    if ((suf === 'sore' || suf === 'malam') && h < 12) h += 12;
    if (h <= 23 && mi <= 59) { out.time = `${pad(h)}:${pad(mi)}`; s = r.rest; }
  }

  // tanggal
  let due = undefined as Date | undefined;
  const set = (d: Date, rest: string) => { due = d; s = rest; };
  if ((r = take(s, /\s(\d{4}-\d{2}-\d{2})(?=\s)/)).m) { const d = parseYmd(r.m![1]); if (d) set(d, r.rest); }
  if (!due && (r = take(s, /\s(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?=\s)/)).m) {
    const day = Number(r.m![1]), mon = Number(r.m![2]) - 1;
    if (day >= 1 && day <= 31 && mon >= 0 && mon <= 11) {
      let y = r.m![3] ? Number(r.m![3]) : today.getFullYear();
      if (y < 100) y += 2000;
      let d = new Date(y, mon, day);
      if (!r.m![3] && d < today) d = new Date(y + 1, mon, day);
      set(d, r.rest);
    }
  }
  if (!due && (r = take(s, /\s(?:hari ini|hr ini|nanti malam|malam ini|sore ini|pagi ini)\b/i)).m) set(today, r.rest);
  if (!due && (r = take(s, /\s(?:besok|bsk|esok)\b/i)).m) set(addDays(today, 1), r.rest);
  if (!due && (r = take(s, /\s(?:lusa)\b/i)).m) set(addDays(today, 2), r.rest);
  if (!due && (r = take(s, /\s(?:minggu|pekan)\s+depan\b/i)).m) set(addDays(today, 7), r.rest);
  if (!due && (r = take(s, /\s(?:bulan)\s+depan\b/i)).m) set(addMonths(today, 1), r.rest);
  if (!due && (r = take(s, /\s(\d{1,2})\s+([A-Za-z]{3,9})\b/)).m && MONTHS[r.m![2].toLowerCase()] !== undefined) {
    const day = Number(r.m![1]), mon = MONTHS[r.m![2].toLowerCase()];
    if (day >= 1 && day <= 31) {
      let d = new Date(today.getFullYear(), mon, day);
      if (d < today) d = new Date(today.getFullYear() + 1, mon, day);
      set(d, r.rest);
    }
  }
  if (!due && (r = take(s, /\s(?:tgl|tanggal)\.?\s*(\d{1,2})\b/i)).m) {
    const day = Number(r.m![1]);
    if (day >= 1 && day <= 31) {
      let d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
      set(d, r.rest);
    }
  }
  if (!due && (r = take(s, /\s(?:hari\s+)?(senin|selasa|rabu|kamis|jum'?at|sabtu|ahad|minggu(?!\s+(?:ini|depan|lalu|kemarin)\b))(\s+depan)?\b/i)).m) {
    const wd = WEEKDAYS[r.m![1].toLowerCase().replace("'", '')];
    if (r.m![2]) {
      // "Jumat depan" = Jumat di pekan (Senin–Minggu) berikutnya
      set(addDays(nextWeekday(today, 1), (wd + 6) % 7), r.rest);
    } else set(nextWeekday(today, wd), r.rest);
  }

  // "pertemuan berikutnya" → tanggal pelajaran itu berikutnya (butuh mapel + jadwal)
  r = take(s, /\s(?:pada\s+)?(?:pertemuan|pelajaran)\s+(?:yang\s+)?(?:berikutnya|selanjutnya|depan|akan\s+datang)\b/i);
  if (r.m) { out.meeting = true; s = r.rest; }

  const subject = tagSubject ?? findSubjectInText(s, known);
  if (subject) out.subject = subject;
  if (out.meeting && !due && subject && ctx.schedule) {
    const d = nextMeeting(ctx.schedule, subject, today);
    if (d) due = d;
  }

  if (due) out.due = ymd(due);
  else if (out.time) out.due = ymd(today);

  let title = s.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) title = title.replace(TRAILING, '').replace(/[\s,.;:-]+$/, '').trim();
  title = title.replace(LEADING, '').replace(/^[\s,.;:-]+/, '').trim();
  out.title = title || input.trim();
  return out;
}
