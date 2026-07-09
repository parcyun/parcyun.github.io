// 의존성 없는 최소 화이트리스트 인라인 새니타이저.
// 관리자 입력(works.title_html / resources.poster_title 등)이 dangerouslySetInnerHTML/set:html로
// 렌더될 때 저장형 XSS를 막는다. RLS로 쓰기는 관리자 1인만 가능하지만 방어적 심층 처리(defense-in-depth).
//
// 동작: 전부 이스케이프한 뒤, 속성 없는 허용 태그(<br>, <strong>, <em>, <b>, <i>)만 복원.
// 따라서 <img onerror>, <script>, <svg onload>, 속성 포함 태그는 그대로 이스케이프되어 무력화된다.
export function sanitizeInlineHtml(input: string | null | undefined): string {
  if (!input) return '';
  const escaped = String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/&lt;(\/?)(strong|em|b|i)&gt;/gi, '<$1$2>');
}
