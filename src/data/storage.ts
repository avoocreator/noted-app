import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { createDB, migrate, type DB } from '../lib/model.ts';

// Storage
const SLOTS = ['noted-0.json', 'noted-1.json'];
const LS_KEY = 'noted-db';
const native = () => Capacitor.isNativePlatform();

let rev = 0;

async function readSlot(name: string): Promise<DB | null> {
  try {
    const r = await Filesystem.readFile({ path: name, directory: Directory.Data, encoding: Encoding.UTF8 });
    const text = typeof r.data === 'string' ? r.data : await (r.data as Blob).text();
    const raw: unknown = JSON.parse(text);
    if (!raw || typeof raw !== 'object') return null;
    return migrate(raw);
  } catch { return null; }
}

export async function loadDB(): Promise<DB> {
  let db: DB | null = null;
  if (native()) {
    const slots = await Promise.all(SLOTS.map(readSlot));
    for (const s of slots) if (s && (!db || s.rev > db.rev)) db = s;
  } else {
    try { const t = localStorage.getItem(LS_KEY); if (t) db = migrate(JSON.parse(t)); } catch { db = null; }
  }
  const out = db ?? createDB();
  rev = out.rev;
  return out;
}

let chain: Promise<void> = Promise.resolve();

// Save
export function saveDB(db: DB): Promise<void> {
  const next = { ...db, rev: ++rev };
  chain = chain.then(async () => {
    const text = JSON.stringify(next);
    if (native()) {
      await Filesystem.writeFile({ path: SLOTS[next.rev % 2], directory: Directory.Data, encoding: Encoding.UTF8, data: text });
    } else {
      try { localStorage.setItem(LS_KEY, text); } catch {}
    }
  }).catch(() => undefined);
  return chain;
}
