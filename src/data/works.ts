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

export function sortWorksForPortfolio(items: Work[]): Work[] {
  return [...items].sort((a, b) => a.num.localeCompare(b.num, undefined, { numeric: true }));
}

export const works: Work[] = sortWorksForPortfolio([
  {
    num: '001',
    title: 'parcyun studio 포트폴리오 허브',
    titleHtml: 'parcyun studio<br>포트폴리오 허브',
    desc: '교육용 웹서비스와 자료를 모은 스튜디오 허브.',
    week: 'Week 01 · 2026.06',
    url: '/',
    status: 'live',
    tags: ['HTML', 'CSS', 'GitHub Pages', 'Static'],
  },
  {
    num: '002',
    title: 'I am Serif 스튜디오 포트폴리오',
    titleHtml: 'I am Serif<br>스튜디오 포트폴리오',
    desc: '세리프 타이포그래피 중심의 미니멀 스튜디오 사이트.',
    week: 'Week 02 · 2026.06',
    url: '/works/002-i-am-serif/',
    status: 'live',
    tags: ['HTML', 'CSS', 'Editorial', 'Static'],
  },
  {
    num: '003',
    title: '공부에서 작품으로, 웹디자인 포트폴리오',
    titleHtml: '공부에서 작품으로<br>웹디자인 포트폴리오',
    desc: '공부하며 만든 웹디자인 결과물을 공개할 공간.',
    week: 'First reveal · Coming soon',
    url: '',
    status: 'soon',
    tags: ['Web Design', 'Portfolio', 'Coming soon'],
  },
  {
    num: '004',
    title: 'MDBF 웹 표준과 컴포넌트 라이브러리',
    titleHtml: 'MDBF<br>Web Standard',
    desc: 'MDBF의 토큰과 컴포넌트를 정리한 웹 표준.',
    week: 'Design System · 2026.09',
    url: '/works/mdbf/',
    status: 'live',
    tags: ['MDBF', 'Design System', 'Components', 'Astro'],
  },
  {
    num: '005',
    title: 'the Masterclass 웹 표준과 컴포넌트 라이브러리',
    titleHtml: 'the Masterclass<br>Web Standard',
    desc: '교사 연수 플랫폼의 재사용 가능한 웹 표준.',
    week: 'Design System · 2026.09',
    url: '/works/masterclass/',
    status: 'live',
    tags: ['Masterclass', 'Design System', 'Components', 'Astro'],
  },
]);
