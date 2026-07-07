// parcyun studio · 자료 데이터 (단일 소스)
// 이 배열에 항목을 추가하면 허브의 "자료 찾기" 검색·필터에 자동 반영된다.
export type Category = '강의 자료' | '교육 활동 자료';

export interface Resource {
  id: string;
  title: string;
  desc: string;
  url: string;
  external?: boolean;
  category: Category;
  subject: string;      // 소분류 (LLM · Harness Agent, Notion 활용, 국어, 수학 · 도형과 기하 …)
  lid: string;          // 포스터 라벨
  posterTitle: string;  // 포스터 제목 (HTML 허용: <strong>, <br>)
  date?: string;
  meta?: string[];      // 메타 칩 (날짜·형식·대상 등)
  tags: string[];
}

export const resources: Resource[] = [
  {
    id: 'academica',
    title: '온라인 연수 녹화본 모아보기',
    desc: 'parcyun studio 온라인 연수 녹화본을 한 곳에서 모아보는 아카이브 사이트.',
    url: './academica-parcyun-studio/',
    category: '강의 자료',
    subject: '연수 아카이브',
    lid: 'Archive · Site',
    posterTitle: '온라인 연수 <strong>녹화본 모아보기</strong>',
    meta: ['ARCHIVE', 'FOR EDUCATORS'],
    tags: ['연수', '아카이브'],
  },
  {
    id: 'llm-fundamentals',
    title: 'LLM 이해하기 · LLM Fundamentals',
    desc: 'NLP · LLM · Tokenization부터 Markdown · Skills · API · MCP · Harness · Orchestration까지 ─ 자율형 AI 에이전트를 다루기 위해 반드시 알아야 할 개념을 17개 풀스크롤 섹션으로 정리.',
    url: './llm-fundamentals/',
    category: '강의 자료',
    subject: 'LLM · Harness Agent',
    lid: 'Lecture · 001',
    posterTitle: '하네스 에이전트를 위한<br><strong>생성형 AI</strong> 기본 이해',
    date: '2026.05.10',
    meta: ['2026.05.10', '44 slides', 'FOR EDUCATORS'],
    tags: ['LLM', 'MCP', 'Agent'],
  },
  {
    id: 'agentic-ai',
    title: 'Agentic AI with LLM',
    desc: 'Claude Desktop을 자율형 에이전트로 직접 셋업하고 운영해보는 실습 가이드. LLM 강의에서 배운 Skills · MCP · Harness · Orchestration 개념을 실제 워크플로우로 구축합니다.',
    url: 'https://parcyun.notion.site/Agentic-AI-with-LLM-3593f99a82238070ab4be47cefd571d7',
    external: true,
    category: '강의 자료',
    subject: 'LLM · Harness Agent',
    lid: 'Lecture · 002 · Hands-On',
    posterTitle: '<strong>Claude Desktop</strong><br>따라하기 실습',
    date: '2026.05.10',
    meta: ['2026.05.10', 'NOTION ↗', 'HANDS-ON'],
    tags: ['Claude Desktop', 'MCP', '실습'],
  },
  {
    id: 'notion-onboarding',
    title: 'Notion 온보딩 가이드',
    desc: '처음 Notion을 시작하는 사용자를 위한 단계별 가이드 ─ 워크스페이스 셋업부터 페이지·데이터베이스 구조화까지 한 번에 익히기.',
    url: 'https://parcyun.notion.site/Notion-8280d9f2847044e6bf48b25a1f199d76',
    external: true,
    category: '강의 자료',
    subject: 'Notion 활용',
    lid: 'Guide · 001',
    posterTitle: '<strong>Notion</strong><br>Onboarding',
    date: '2026.06.02',
    meta: ['2026.06.02', 'NOTION ↗', 'BEGINNER'],
    tags: ['Notion', '온보딩', '기초'],
  },
  {
    id: 'spell-drill',
    title: '한글 맞춤법 연습 게임',
    desc: '헷갈리기 쉬운 한글 맞춤법을 게임으로 익히는 학생용 학습 도구. 짧은 자투리 시간에 교실에서 바로 활용 가능합니다.',
    url: '/korean-spell-drill-parcyun/',
    external: true,
    category: '교육 활동 자료',
    subject: '국어',
    lid: 'Activity · 001',
    posterTitle: '<strong>맞춤법</strong><br>연습 게임',
    date: '2026.05.15',
    meta: ['2026.05.15', 'GAME ↗', '초등'],
    tags: ['국어', '맞춤법', '게임'],
  },
  {
    id: 'math-volume',
    title: '쌓기나무 공장 · 부피 검수 미션',
    desc: '세기 = 곱하기를 발견하고, 셀 수 없는 상자를 곱셈으로 검수하고, 역추리·불량 검수까지 ─ 3단계 공장 게임으로 직육면체의 부피(가로×세로×높이)를 익히는 인쇄용 활동지.',
    url: './math-solid-volume/',
    category: '교육 활동 자료',
    subject: '수학 · 도형과 기하',
    lid: 'Activity · 부피',
    posterTitle: '쌓기나무로 푸는<br><strong>입체도형의 부피</strong>',
    date: '2026.06.23',
    meta: ['2026.06.23', '활동지 + 정답', '6학년'],
    tags: ['부피', '직육면체', '인쇄용'],
  },
  {
    id: 'world-map',
    title: '세계 지도 · 6대륙 5대양',
    desc: '메르카토르·렌즈·지구본 3가지 도법을 오가며 6대륙과 5대양을 탐색하는 인터랙티브 세계지도. 대륙·대양·국가를 클릭해 강조·설명을 보고, 격자·확대·회전으로 자유롭게 살펴봅니다.',
    url: './world-map/',
    category: '교육 활동 자료',
    subject: '사회',
    lid: 'Interactive · 지도',
    posterTitle: '6대륙 5대양<br><strong>인터랙티브 세계지도</strong>',
    date: '2026.07.03',
    meta: ['2026.07.03', '인터랙티브', '초등 사회'],
    tags: ['세계지리', '6대륙5대양', '지구본'],
  },
  {
    id: 'ai-class',
    title: 'AI 활용 수업',
    desc: '[12차시] 컴퓨터 언어의 이해부터 바이브 코딩 해커톤까지 ─ 초등 교실에서 AI를 다루는 한 학기 단위의 통합 커리큘럼.',
    url: 'https://parcyun.notion.site/6-12-3683f99a822380afb2b8ded430282603',
    external: true,
    category: '교육 활동 자료',
    subject: 'AI 활용 수업',
    lid: 'Class · 12차시',
    posterTitle: '<strong>AI 활용</strong><br>수업 커리큘럼',
    date: '2026.06.02',
    meta: ['2026.06.02', 'NOTION ↗', '12 SESSIONS'],
    tags: ['AI 활용', '커리큘럼', '초등'],
  },
];
