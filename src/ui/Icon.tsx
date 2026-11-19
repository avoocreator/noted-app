const P = {
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  bag: 'M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0',
  notes: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',
  paste: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4',
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  bell: 'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v7h14v-7',
  download: 'M12 4v12M8 12l4 4 4-4M5 20h14',
  upload: 'M12 16V4M8 8l4-4 4 4M5 20h14',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  flag: 'M5 21V4h12l-2 4 2 4H5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  listOl: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1v4M4 11h3l-3 4h3M4 17h3v1.5H5.5M4 21h3',
  checkSq: 'M4 4h16v16H4zM8 12.5l3 3 5-6',
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, strokeWidth = 2 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
