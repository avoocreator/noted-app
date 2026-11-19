import { useStore, type Tab } from '../data/store.ts';
import { Icon, type IconName } from './Icon.tsx';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'week', label: 'Minggu ini', icon: 'calendar' },
  { id: 'bag', label: 'Tas Besok', icon: 'bag' },
  { id: 'notes', label: 'Catatan', icon: 'notes' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' },
];

export function TabBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  return (
    <nav className="tabbar" aria-label="Navigasi">
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} size={22} />
          <small>{t.label}</small>
        </button>
      ))}
    </nav>
  );
}
