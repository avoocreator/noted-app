import { parseTask, type Parsed, type ParseCtx } from './parse.ts';

const TASK_WORDS = /\b(tugas|pr|pekerjaan rumah|kumpul|dikumpul|dikumpulkan|mengumpul|deadline|tenggat|ulangan|ujian|uts|uas|kuis|quiz|presentasi|laporan|makalah|proyek|projek|praktikum|kerjakan|mengerjakan|bawa|dibawa|halaman|hal\.?)\b/i;
const NOISE = /^(?:<media[^>]*>|<.*tidak disertakan>|pesan ini dihapus|you deleted this message|anda menghapus pesan ini|.*\b(?:bergabung|keluar|menambahkan|mengubah)\b.*|\W*)$/i;

// Types
export interface Pasted extends Parsed {
  source: string;
  likely: boolean;
}

// Normalizer
export function stripWaPrefix(line: string): string {
  let s = line.trim();
  s = s.replace(/^\[[^\]]{4,40}\]\s*[^:]{1,40}:\s*/, '');
  s = s.replace(/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}[.:]\d{2}(?::\d{2})?\s*(?:[APap][Mm])?\s*[-–]\s*[^:]{1,40}:\s*/, '');
  s = s.replace(/^\d{1,2}[.:]\d{2}\s*[-–]\s*[^:]{1,40}:\s*/, '');
  s = s.replace(/^(?:[-•*·]|\d{1,2}[.)])\s+/, '');
  return s.trim();
}

// Parser
export function parseWaPaste(raw: string, ctx: ParseCtx = {}): Pasted[] {
  const out: Pasted[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const src = stripWaPrefix(line);
    if (!src || NOISE.test(src)) continue;
    const p = parseTask(src, ctx);
    out.push({ ...p, source: src, likely: !!p.due || TASK_WORDS.test(src) });
  }
  return out;
}
