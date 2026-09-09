export type StandardItem = {
  name: string;
  description: string;
  source: string;
};

export type BrandStandard = {
  slug: 'mdbf' | 'masterclass';
  name: string;
  koreanName: string;
  eyebrow: string;
  summary: string;
  tone: string;
  surface: 'light' | 'dark';
  palette: { name: string; value: string }[];
  typography: { role: string; family: string; note: string }[];
  objects: StandardItem[];
  sections: StandardItem[];
  rules: string[];
  manifestUrl: string;
  cssUrl: string;
};

export const brandStandards: Record<BrandStandard['slug'], BrandStandard> = {
  mdbf: {
    slug: 'mdbf',
    name: 'MDBF',
    koreanName: '몽당분필 · 디미교연',
    eyebrow: 'Official association website system',
    summary: '교사 공동체의 공공성과 교육 전문성을 선명한 타이포그래피와 에디토리얼 구조로 전달하는 웹 표준입니다.',
    tone: 'Editorial · Public · Clear',
    surface: 'light',
    palette: [
      { name: 'MDBF Blue', value: '#3364D9' },
      { name: 'Blue 900', value: '#0F3AA0' },
      { name: 'Ink', value: '#010F2F' },
      { name: 'Blue 50', value: '#F0F4FF' },
      { name: 'Line', value: '#C2D4FF' },
      { name: 'Paper', value: '#FFFFFF' },
    ],
    typography: [
      { role: 'Body / UI', family: 'Pretendard', note: '300–700 · 한글 본문과 인터페이스' },
      { role: 'Logo companion', family: 'Nanum Gothic', note: '법인명·브랜드 병기' },
      { role: 'Editorial label', family: 'Pretendard', note: '11–13px · 넓은 자간의 영문/번호 라벨' },
    ],
    objects: [
      { name: 'MDBF Header', description: '메가 메뉴와 외부 채널을 포함하는 공용 내비게이션.', source: 'MdbfHeader.tsx' },
      { name: 'Route Link', description: 'iframe과 일반 브라우저 라우팅을 함께 처리하는 링크.', source: 'MdbfRouteLink.tsx' },
      { name: 'Hand-drawn Action', description: 'Blue 900 텍스트와 손그림 화살표를 결합한 상세보기 액션.', source: 'HanddrawnArrow.tsx' },
      { name: 'Modal Layer', description: '현재 뷰포트를 기준으로 여닫고 스크롤을 잠그는 상세 레이어.', source: 'useMdbfModalLayer.ts' },
      { name: 'Member Gate', description: '정회원 전용 정보의 접근 상태와 안내를 묶은 게이트.', source: 'MemberGate.tsx' },
      { name: 'Inquiry Composer', description: '문의 작성과 상태 피드백을 한 흐름으로 구성한 폼.', source: 'InquiryComposer.tsx' },
    ],
    sections: [
      { name: 'Editorial Hero', description: '큰 제목, 짧은 라벨, 설명문을 비대칭 그리드로 조합.', source: 'MdbfPageRouter.tsx' },
      { name: 'What we do', description: '고정 높이 안에서 항목과 상세 설명이 전환되는 사업 목록.', source: 'MdbfHomeWork.tsx' },
      { name: 'Board Archive', description: '공지·새소식·언론보도를 검색하고 상세 모달로 연결.', source: 'MdbfBoardArchive.tsx' },
      { name: 'Business Detail', description: '캐러셀, 사업 개요, 데이터 갤러리로 이어지는 장문 모달.', source: 'CoreBusinessDetailModal.tsx' },
      { name: 'Partner Marquee', description: '서로 다른 비율의 기관 로고를 안전 영역 안에서 순환 표시.', source: 'MdbfPartnerMarquee.tsx' },
      { name: 'Channel Grid', description: '브랜드 채널 로고·설명·외부 링크를 일정한 카드로 정렬.', source: 'MdbfChannelGrid.tsx' },
    ],
    rules: [
      '브랜드 컬러는 #3364D9를 중심으로 사용하며 다른 브랜드의 강조색을 섞지 않습니다.',
      '본문은 Blue 900 또는 Ink를 사용하고, 강조 텍스트만 명도 대비를 달리합니다.',
      '공식 페이지는 장식보다 정보 위계와 넉넉한 여백을 우선합니다.',
      '로고 이미지는 contain과 정방형 안전 영역을 사용해 잘림과 왜곡을 막습니다.',
    ],
    manifestUrl: '/works/mdbf/assets/component-manifest-v1.json',
    cssUrl: '/works/mdbf/assets/mdbf-standard-v1.css',
  },
  masterclass: {
    slug: 'masterclass',
    name: 'the Masterclass',
    koreanName: '교사를 위한 연수 플랫폼',
    eyebrow: 'Teacher training platform system',
    summary: '콘텐츠 탐색과 학습 행동이 자연스럽게 이어지도록 어두운 무대 위에 카드, 캐러셀, 검색과 접근 제어를 조직한 제품 표준입니다.',
    tone: 'Editorial · Premium · Focused',
    surface: 'dark',
    palette: [
      { name: 'Masterclass Blue', value: '#3364D9' },
      { name: 'Highlight', value: '#5B8CFF' },
      { name: 'Night', value: '#07090F' },
      { name: 'Panel', value: '#0B0D16' },
      { name: 'Primary text', value: '#E8EAF0' },
      { name: 'Muted text', value: '#8C93A6' },
    ],
    typography: [
      { role: 'Body / UI', family: 'Pretendard', note: '400–700 · 학습 인터페이스와 한글 본문' },
      { role: 'Wordmark / Latin', family: 'Montserrat', note: '300–700 · 영문 제목과 워드마크' },
      { role: 'Signature', family: 'Covered By Your Grace', note: '제작 크레디트에 한정' },
    ],
    objects: [
      { name: 'Masterclass Logo', description: '강조된 M과 워드마크의 크기·색상 규칙을 캡슐화.', source: 'MasterclassLogo.tsx' },
      { name: 'Navigation Search', description: '강의·강사·자료 검색 진입점을 공용 상단바에 제공.', source: 'NavSearch.tsx' },
      { name: 'Course Card', description: '썸네일, 메타데이터, 강사와 콘텐츠 상태를 묶은 기본 단위.', source: 'CourseCard.tsx' },
      { name: 'Course Carousel', description: '한 칸 이동과 드래그 탐색을 위한 가로 콘텐츠 레일.', source: 'CourseCarousel.tsx' },
      { name: 'Access Action', description: '회원 등급과 콘텐츠 공개 범위에 따라 재생·다운로드를 제어.', source: 'ContentAccessAction.tsx' },
      { name: 'Action Buttons', description: 'Flat과 Glass 변형을 역할별로 분리한 버튼 계열.', source: 'FlatButton.tsx · GlassButton.tsx' },
    ],
    sections: [
      { name: 'Public Chrome', description: '상단 탐색, 프로필, 알림과 공용 푸터를 페이지 전반에 유지.', source: 'PublicChrome.tsx' },
      { name: 'Hero Stage', description: '브랜드 메시지, 카테고리 진입점과 참여 CTA를 한 화면에 구성.', source: 'HeroSection.tsx' },
      { name: 'Curated Row', description: '지금 사랑받는 클래스 등 큐레이션 제목과 카드 레일의 반복 패턴.', source: 'CourseCarousel.tsx' },
      { name: 'Course Detail', description: '본문, 이미지 갤러리, 리뷰와 접근 동작을 연결하는 학습 상세.', source: 'CourseDetailView.tsx' },
      { name: 'Original Series', description: '오리지널 카테고리와 시리즈 묶음을 위한 독립 탐색 구조.', source: 'OriginalCategory.tsx · SeriesCarousel.tsx' },
      { name: 'About Sequence', description: '플랫폼 목적과 운영 가치를 에디토리얼 흐름으로 소개.', source: 'MasterclassAboutSections.tsx' },
    ],
    rules: [
      'Night 배경과 흰색 텍스트를 기본으로 하고 Blue는 선택·행동·상태에 집중합니다.',
      '카드는 동일한 썸네일 비율과 두 줄 제목 제한으로 큐레이션 리듬을 유지합니다.',
      '캐러셀은 한 번에 한 카드 단위로 이동하며 포인터 드래그와 키보드 탐색을 함께 지원합니다.',
      '재생과 다운로드 권한은 화면 장식이 아니라 공용 접근 제어 컴포넌트에서 판단합니다.',
    ],
    manifestUrl: '/works/masterclass/assets/component-manifest-v1.json',
    cssUrl: '/works/masterclass/assets/masterclass-standard-v1.css',
  },
};
