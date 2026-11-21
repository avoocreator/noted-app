// Types
export interface SubjectDef { id: string; label: string; aliases: string[] }

// Constants
export const SUBJECTS: SubjectDef[] = [
  { id: 'matematika', label: 'Matematika', aliases: ['matematika', 'mtk', 'mat', 'math'] },
  { id: 'b-indonesia', label: 'B. Indonesia', aliases: ['bahasa indonesia', 'b indonesia', 'b indo', 'bindo', 'bin'] },
  { id: 'b-inggris', label: 'B. Inggris', aliases: ['bahasa inggris', 'b inggris', 'b ing', 'big', 'english'] },
  { id: 'ipa', label: 'IPA', aliases: ['ipa', 'sains'] },
  { id: 'ips', label: 'IPS', aliases: ['ips'] },
  { id: 'fisika', label: 'Fisika', aliases: ['fisika', 'fis'] },
  { id: 'kimia', label: 'Kimia', aliases: ['kimia', 'kim'] },
  { id: 'biologi', label: 'Biologi', aliases: ['biologi', 'bio'] },
  { id: 'sejarah', label: 'Sejarah', aliases: ['sejarah', 'sej'] },
  { id: 'geografi', label: 'Geografi', aliases: ['geografi', 'geo'] },
  { id: 'ekonomi', label: 'Ekonomi', aliases: ['ekonomi', 'eko'] },
  { id: 'sosiologi', label: 'Sosiologi', aliases: ['sosiologi', 'sos'] },
  { id: 'pkn', label: 'PKn', aliases: ['pkn', 'ppkn', 'pp', 'pendidikan pancasila', 'pancasila'] },
  { id: 'agama', label: 'Agama', aliases: ['agama', 'pai', 'pendidikan agama'] },
  { id: 'informatika', label: 'Informatika', aliases: ['informatika', 'tik', 'inf'] },
  { id: 'seni', label: 'Seni Budaya', aliases: ['seni budaya', 'sb', 'sbk', 'seni'] },
  { id: 'pjok', label: 'PJOK', aliases: ['pjok', 'penjas', 'olahraga'] },
  { id: 'prakarya', label: 'Prakarya', aliases: ['prakarya', 'pkwu'] },
  { id: 'b-jawa', label: 'B. Jawa', aliases: ['bahasa jawa', 'b jawa', 'bj'] },
  { id: 'bk', label: 'BK', aliases: ['bk', 'bimbingan konseling'] },
];

export const COMMON_SUBJECTS = ['Matematika', 'B. Indonesia', 'B. Inggris', 'IPA', 'IPS', 'Fisika', 'Kimia', 'Biologi', 'Sejarah', 'PJOK'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Matcher
export function subjectKey(name: string): string {
  const n = norm(name);
  if (!n) return '';
  for (const d of SUBJECTS) if (d.aliases.some((a) => norm(a) === n)) return d.id;
  for (const d of SUBJECTS) {
    if (d.aliases.some((a) => { const x = norm(a); return x.length >= 3 && n.startsWith(x) && n.length - x.length <= 2; })) return d.id;
  }
  return n;
}

export const sameSubject = (a?: string | null, b?: string | null): boolean => !!a && !!b && subjectKey(a) === subjectKey(b);

export function displaySubject(name: string): string {
  const key = subjectKey(name);
  const def = SUBJECTS.find((d) => d.id === key);
  const n = norm(name);
  return def && def.aliases.some((a) => norm(a) === n) ? def.label : name.trim();
}

const wordRe = (term: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(term).replace(/\s+/g, '[\\s.]*')}(?![\\p{L}\\p{N}])`, 'iu');

export function findSubjectInText(text: string, known: string[] = []): string | undefined {
  for (const k of [...known].sort((a, b) => b.length - a.length)) {
    if (k.trim().length >= 2 && wordRe(k.trim()).test(text)) return k;
  }
  for (const d of SUBJECTS) {
    for (const a of [...d.aliases].sort((x, y) => y.length - x.length)) {
      if (wordRe(a).test(text)) return d.label;
    }
  }
  return undefined;
}

export function canonicalSubject(raw: string, known: string[] = []): string {
  const hit = known.find((k) => sameSubject(k, raw) && norm(k) === norm(raw)) ?? known.find((k) => norm(k) === norm(raw));
  return hit ?? displaySubject(raw);
}
