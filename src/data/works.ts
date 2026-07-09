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

export const works: Work[] = [
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
    title: '다음 주 공개 예정',
    titleHtml: '다음 주<br>공개 예정',
    desc: '다음 웹서비스를 준비 중입니다. 매주 이 자리에 새 카드가 하나씩 추가됩니다.',
    week: 'Week 03 · 2026.06',
    url: '',
    status: 'soon',
    tags: ['Coming soon'],
  },
];
