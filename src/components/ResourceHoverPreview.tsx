import type { Resource } from '../data/resources';
import { icon, typeIcon } from '../lib/icons';

const PREVIEW_IMAGE_BY_ID: Record<string, string> = {
  academica: '/images/resource-previews/academica.png',
  'llm-fundamentals': '/images/resource-previews/llm-fundamentals.png',
  'agentic-ai': '/images/resource-previews/agentic-ai.png',
  'notion-onboarding': '/images/resource-previews/notion-onboarding.png',
  'ai-edtech-tools': '/images/resource-previews/ai-edtech-tools.png',
  'edubeige': '/images/resource-previews/edubeige.png',
  'math-volume': '/images/resource-previews/math-volume.png',
  'world-city-research': '/images/resource-previews/world-city-research.png',
  'world-map': '/images/resource-previews/world-map.png',
  'ai-class': '/images/resource-previews/ai-class.png',
  'kocomate': '/images/resource-previews/kocomate.png',
  'zoomit': '/images/resource-previews/zoomit.png',
  'snipaste': '/images/resource-previews/snipaste.png',
  'spell-drill': '/spell-drill/og-cover.png',
};

const PREVIEW_DESCRIPTION_BY_ID: Record<string, string> = {
  academica: 'parcyun studio에서 진행한 교사 연수의 녹화본을 주제별로 다시 찾아볼 수 있는 영상 아카이브입니다. 놓친 연수를 복습하거나 필요한 대목만 골라 수업 준비에 활용할 수 있습니다.',
  'llm-fundamentals': 'LLM의 작동 원리부터 Skills·API·MCP·Harness·Orchestration까지, AI 에이전트를 다루기 위한 핵심 개념을 17개 섹션으로 설명합니다. 기술 용어를 교육 현장의 실제 활용 맥락과 함께 따라갈 수 있는 입문 강의입니다.',
  'agentic-ai': 'Claude Desktop을 자율형 에이전트 환경으로 설정하고 Skills와 MCP를 실제 워크플로에 연결하는 실습 자료입니다. 개념 설명에 머물지 않고 설치·구성·운영 흐름을 단계별로 직접 재현할 수 있습니다.',
  'notion-onboarding': 'Notion을 처음 쓰는 사용자가 워크스페이스, 페이지, 블록, 데이터베이스의 관계를 순서대로 익히는 온보딩 가이드입니다. 개인 메모에서 협업용 자료 구조까지 확장하는 기본 사용법을 한곳에 정리했습니다.',
  'ai-edtech-tools': '교육 현장에서 바로 검토할 수 있는 AI·에듀테크 서비스를 용도별로 모은 교사용 도구 목록입니다. 수업 준비, 콘텐츠 제작, 학생 활동 등 필요한 상황에 맞춰 후보 도구를 빠르게 탐색할 수 있습니다.',
  edubeige: '과목·학년·수업 상황을 기준으로 에듀테크 도구와 실제 수업 사례를 탐색하고 저장할 수 있는 교사 전용 큐레이션 서비스입니다. 도구 이름보다 수업 목적에서 출발해 적합한 활용 사례를 찾는 데 초점을 둡니다.',
  'spell-drill': '학생들이 자주 헷갈리는 한글 맞춤법을 짧은 문제와 즉각적인 피드백으로 반복 연습하는 웹 게임입니다. 별도 설치 없이 교실의 자투리 시간이나 개별 학습 활동에 바로 사용할 수 있습니다.',
  'math-volume': '쌓기나무 공장이라는 상황 속에서 상자의 수를 곱셈으로 검수하며 직육면체 부피 공식을 발견하는 인쇄용 활동지입니다. 기본 세기부터 역추리와 불량 검수까지 세 단계 난이도로 이어집니다.',
  'world-city-research': '학생이 여행하고 싶은 도시를 골라 위치·기후·명소·문화·산업을 조사하는 6학년 사회 학습지입니다. 단순 정보 수집을 넘어 지리적 환경과 사람들의 생활을 연결해 정리하도록 구성했습니다.',
  'world-map': '메르카토르 지도, 렌즈 보기, 3D 지구본을 오가며 6대륙과 5대양을 탐색하는 인터랙티브 자료입니다. 국가와 대륙을 클릭하고 확대·회전하며 세계지리 개념을 시각적으로 확인할 수 있습니다.',
  'ai-class': '2026년 6월 12일 AI 수업에서 사용한 안내와 활동 자료를 모은 Notion 페이지입니다. 수업의 진행 순서와 필요한 링크를 한 화면에서 확인하며 활동을 따라갈 수 있습니다.',
  kocomate: '코코아팹의 Kocomate는 피지컬 컴퓨팅과 코딩 교육에 활용할 수 있는 교육용 도구와 학습 콘텐츠를 제공합니다. 학생들이 센서와 보드를 연결하고 결과를 직접 확인하는 메이커 수업에 활용할 수 있습니다.',
  zoomit: 'Microsoft Sysinternals의 ZoomIt은 화면 확대, 주석, 타이머 기능을 제공하는 Windows 발표 보조 도구입니다. 교사가 수업 화면의 중요한 부분을 즉시 확대하거나 표시해 학생의 시선을 집중시키는 데 유용합니다.',
  snipaste: 'Snipaste는 화면 일부를 빠르게 캡처하고, 캡처 이미지를 화면 위에 고정해 비교·설명할 수 있는 도구입니다. 간단한 주석과 색상 선택 기능도 제공해 수업 자료 제작과 실시간 시연을 효율적으로 돕습니다.',
};

export function resourcePreviewId(resourceId: string) {
  return `resource-preview-${resourceId.replace(/[^a-z0-9_-]/gi, '-')}`;
}

export default function ResourceHoverPreview({ resource }: { resource: Resource }) {
  const previewId = resourcePreviewId(resource.id);
  const previewImage = PREVIEW_IMAGE_BY_ID[resource.id] || '/images/resource-previews/preview-unavailable.svg';
  const previewDescription = PREVIEW_DESCRIPTION_BY_ID[resource.id] || resource.desc;

  return (
    <aside className="resource-hover-preview" id={previewId} role="tooltip">
      <img className="resource-hover-image" src={previewImage} alt="" loading="lazy" />
      <span className="resource-hover-copy">
        <span className="resource-hover-kind">
          <span className="ico" dangerouslySetInnerHTML={{ __html: icon(typeIcon[resource.type] || 'guide', 14) }} />
          {resource.type} · {resource.subject}
        </span>
        <strong>{resource.title}</strong>
        <span>{previewDescription}</span>
      </span>
    </aside>
  );
}
