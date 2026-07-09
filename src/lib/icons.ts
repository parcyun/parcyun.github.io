// parcyun studio · 라인 아이콘 (stroke, currentColor) — Astro는 set:html, React는 dangerouslySetInnerHTML로 사용
const PATHS: Record<string, string> = {
  game: '<rect x="2" y="6" width="20" height="12" rx="5"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11" r=".5" fill="currentColor" stroke="none"/><circle cx="18" cy="13" r=".5" fill="currentColor" stroke="none"/>',
  worksheet: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  curriculum: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  interactive: '<path d="M5 4.5 12.5 20l2.2-6.3L21 11.5 5 4.5Z"/>',
  lecture: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8"/><path d="M12 16v4"/><path d="m10.5 8 3.5 2-3.5 2z"/>',
  handson: '<path d="M14.6 6.4a3.8 3.8 0 0 0-5 5L4 17l3 3 5.6-5.6a3.8 3.8 0 0 0 5-5l-2.3 2.3-2-2 2.3-2.3Z"/>',
  guide: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H14v16H5.5A1.5 1.5 0 0 0 4 20.5Z"/><path d="M14 3h4.5A1.5 1.5 0 0 1 20 4.5V19"/>',
  archive: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7.5" y1="4" x2="7.5" y2="20"/><line x1="16.5" y1="4" x2="16.5" y2="20"/><line x1="3" y1="9.3" x2="7.5" y2="9.3"/><line x1="16.5" y1="9.3" x2="21" y2="9.3"/><line x1="3" y1="14.6" x2="7.5" y2="14.6"/><line x1="16.5" y1="14.6" x2="21" y2="14.6"/>',
  books: '<rect x="3" y="4" width="4.5" height="16" rx="1"/><rect x="9" y="4" width="4.5" height="16" rx="1"/><path d="m16.2 5.4 3.9 1-2.6 14.2-3.9-1z"/>',
  gears: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><path d="m13 6 6 6-6 6"/>',
  arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><path d="m11 6-6 6 6 6"/>',
  arrowUpRight: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
  coffee: '<path d="M17 8h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M3 8h14v6.5A4.5 4.5 0 0 1 12.5 19h-5A4.5 4.5 0 0 1 3 14.5Z"/><line x1="7" y1="2.5" x2="7" y2="4.5"/><line x1="11" y1="2.5" x2="11" y2="4.5"/>',
};

export function icon(name: string, size = 22): string {
  const inner = PATHS[name] || PATHS.arrowRight;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// 자료 타입 → 아이콘
export const typeIcon: Record<string, string> = {
  '게임': 'game',
  '활동지': 'worksheet',
  '커리큘럼': 'curriculum',
  '인터랙티브': 'interactive',
  '강의': 'lecture',
  '실습': 'handson',
  '가이드': 'guide',
  '아카이브': 'archive',
};
