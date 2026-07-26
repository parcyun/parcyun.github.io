import type { Work } from '../data/works';

const PREVIEW_DESCRIPTION_BY_NUM: Record<string, string> = {
  '001': 'parcyun studio가 만든 강의 자료와 교육용 웹서비스를 한곳에서 탐색하는 공식 포트폴리오 허브입니다. ACADEMICA, ATLAS GEARS, Works를 중심으로 새 프로젝트와 공개 자료가 계속 연결됩니다.',
  '002': '세리프 타이포그래피와 극도로 절제된 레이아웃을 연구해 완성한 독립 디자인 스튜디오 포트폴리오입니다. 미색 바탕, 순수 블랙 포인트, 웜 그레이 이미지가 이어지는 단일 스크롤 경험으로 구성했습니다.',
  '003': '웹디자인을 공부하며 익힌 타이포그래피·레이아웃·인터랙션을 실제 사이트로 완성해 공개할 다음 포트폴리오 프로젝트입니다. 결과물뿐 아니라 어떤 기준으로 디자인하고 구현했는지도 함께 소개할 예정입니다.',
};

const PREVIEW_IMAGE_BY_NUM: Record<string, string> = {
  '001': '/images/work-previews/001.png',
  '002': '/images/work-previews/002.png',
  '003': '/images/work-previews/003.png',
};

export function workPreviewId(workNum: string) {
  return `work-preview-${workNum.replace(/[^a-z0-9_-]/gi, '-')}`;
}

export default function WorkHoverPreview({ work }: { work: Work }) {
  const previewDescription = PREVIEW_DESCRIPTION_BY_NUM[work.num] || work.desc;
  const previewImage = PREVIEW_IMAGE_BY_NUM[work.num] || '/images/resource-previews/preview-unavailable.svg';

  return (
    <aside className="work-hover-preview" id={workPreviewId(work.num)} role="tooltip">
      <img
        className="work-hover-image"
        src={previewImage}
        alt=""
        loading="lazy"
      />
      <span className="work-hover-copy">
        <span className="work-hover-kind">{work.status === 'live' ? 'Live project' : 'Coming soon'} · {work.week}</span>
        <strong>{work.title}</strong>
        <span>{previewDescription}</span>
      </span>
    </aside>
  );
}
