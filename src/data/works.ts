// parcyun studio · Works 데이터 (1주 1웹서비스 아카이브 · 단일 소스)
// 매주 항목을 추가하면 works 갤러리 + 필터에 자동 반영된다.
export type WorkStatus = 'live' | 'soon';

export interface Work {
  num: string;
  title: string;       // 접근성용 텍스트 제목
  titleHtml: string;   // 포스터 제목 (HTML 허용: <br>)
  desc: string;
  week: string;
  url: string;
  status: WorkStatus;
  tags: string[];
}

const PORTFOLIO_ORDER: Record<string, number> = {
  '/works/002-i-am-serif/': 10,
  '/works/mdbf/': 20,
  '/works/masterclass/': 30,
  '/': 40,
};

export function sortWorksForPortfolio(items: Work[]): Work[] {
  return [...items].sort((a, b) =>
    (PORTFOLIO_ORDER[a.url] ?? 100) - (PORTFOLIO_ORDER[b.url] ?? 100)
    || a.num.localeCompare(b.num)
  );
}

export const works: Work[] = sortWorksForPortfolio([
  {
    num: '001',
    title: 'parcyun studio 포트폴리오 허브',
    titleHtml: 'parcyun studio<br>포트폴리오 허브',
    desc: '웹서비스를 한 주에 하나씩 쌓아갈 정적 포트폴리오 허브. GitHub Pages 위에 시네마틱 브랜드로 구현한 첫 결과물.',
    week: 'Week 01 · 2026.06',
    url: '/',
    status: 'live',
    tags: ['HTML', 'CSS', 'GitHub Pages', 'Static'],
  },
  {
    num: '002',
    title: 'I am Serif 스튜디오 포트폴리오',
    titleHtml: 'I am Serif<br>스튜디오 포트폴리오',
    desc: '세리프 전용 · 극한 미니멀리즘으로 구현한 상업 스튜디오 포트폴리오. 미색 바탕에 순수 블랙 포인트, 웜 그레이스케일 이미지의 단일 스크롤 사이트.',
    week: 'Week 02 · 2026.06',
    url: '/works/002-i-am-serif/',
    status: 'live',
    tags: ['HTML', 'CSS', 'Editorial', 'Static'],
  },
  {
    num: '003',
    title: '공부에서 작품으로, 웹디자인 포트폴리오',
    titleHtml: '공부에서 작품으로<br>웹디자인 포트폴리오',
    desc: '웹디자인을 공부하며 익힌 타이포그래피·레이아웃·인터랙션을 실제 사이트로 완성해 공개하는 공간입니다. 첫 결과물과 제작 이야기를 곧 선보입니다.',
    week: 'First reveal · Coming soon',
    url: '',
    status: 'soon',
    tags: ['Web Design', 'Portfolio', 'Coming soon'],
  },
  {
    num: '004',
    title: 'MDBF 웹 표준과 컴포넌트 라이브러리',
    titleHtml: 'MDBF<br>Web Standard',
    desc: '몽당분필·디미교연 웹사이트에서 반복되는 오브젝트와 섹션을 감사해 토큰, 컴포넌트, 구성 패턴으로 정리한 브랜드 표준.',
    week: 'Design System · 2026.09',
    url: '/works/mdbf/',
    status: 'live',
    tags: ['MDBF', 'Design System', 'Components', 'Astro'],
  },
  {
    num: '005',
    title: 'the Masterclass 웹 표준과 컴포넌트 라이브러리',
    titleHtml: 'the Masterclass<br>Web Standard',
    desc: '교사 연수 플랫폼의 탐색, 콘텐츠 카드, 캐러셀과 접근 제어 구조를 재사용 가능한 제품 컴포넌트로 정리한 웹 표준.',
    week: 'Design System · 2026.09',
    url: '/works/masterclass/',
    status: 'live',
    tags: ['Masterclass', 'Design System', 'Components', 'Astro'],
  },
]);
