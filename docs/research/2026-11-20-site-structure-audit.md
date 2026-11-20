# parcyun.github.io 전체 사이트 구조 점검

후속 반영(2026-11-20): 사용자 결정에 따라 `/web-learning/`과 `/geoweb-battle/music-credits.html`에 robots noindex를 추가했다. URL·내용·출처 링크는 유지하고 사이트맵 제외도 유지한다. 아래 원시 점검과 권고는 변경 전 스냅샷이며 현재 미결정 항목이 아니다. 실제 검색 결과 삭제 시점은 검색엔진 재수집에 달려 있으며 확인하지 않았다.

확인: 2026-11-20. 기준 소스: `142b1c7` 및 이번 Dexterity 푸터 수정. [원시 점검 결과](2026-11-20-sitemap-audit.json), [레퍼런스·구성요소 검토](2026-11-20-dexterity-reference-review.md).

## 결과

- 빌드된 HTML 38개, 사이트맵 URL 26개. 사이트맵 대상은 모두 존재하며 자기 주소 canonical·색인 지시·robots 경로 사이에 충돌이 없다.
- 공개 HTML 38개와 sitemap.xml·robots.txt를 GET하여 40개 모두 HTTP 200 확인. 정적 HTML 내부 링크·앵커·참조 애셋의 누락은 발견되지 않았다.
- 임의의 없는 주소, `/world-map/dev/`, `/world-map/battle/`는 HTTP 404. 배틀 런타임을 다시 공개하지 않았다. `/404.html` 자체의 200은 없는 주소의 정상 404 응답과 구분한다.
- 개선 권고 2개는 아래에 기록했다. 검색 정책 변경·페이지 비공개화는 이번에 시행하지 않았다.

## 사이트맵 26개 — 사용자 관점의 묶음

아래는 의미상 분류다. 하위 서비스는 실제로 루트 경로에 있으며 디렉터리 이동을 제안하는 것이 아니다.

| 영역 | 현재 사이트맵 경로 |
|---|---|
| 글로벌 홈 | `/` |
| 기록·가이드북 | `/dexterity/`, `/dexterity/hyangmisa/`, `/dexterity/guidebook/geoweb/`, `/dexterity/guidebook/spell-drill/`, `/dexterity/guidebook/satury/` |
| 강의 자료 | `/academica/`, `/academica-parcyun-studio/`, `/llm-fundamentals/` |
| 교육 활동·서비스 | `/atlas-gears/`, `/world-map/`, `/world-map/about/`, `/spell-drill/`, `/spell-drill/about/`, `/spell-drill/music-credits.html`, `/satury/`, `/satury/about/`, `/math-solid-volume/` |
| 제작·작품 | `/works/`, `/works/002-i-am-serif/`, `/works/masterclass/`, `/works/mdbf/` |
| 별도 스튜디오 페이지 | `/studio/` |
| 공통 정보 | `/reviews/`, `/privacy/`, `/terms/` |

메인 → 자료 허브 → 서비스 → 소개·가이드북이라는 경로를 유지할 수 있는 구조다. 사이트맵의 평면적인 XML 나열 자체는 오류가 아니다. RSS `/dexterity/feed.xml`은 HTML 문서 수에 포함하지 않았으며 head 자동 발견 링크는 존재한다.

## 사이트맵 밖 HTML 12개

| 경로 | 현재 상태·판단 |
|---|---|
| `/404.html` | noindex, 오류 화면: 제외 유지 |
| `/admin/` | noindex,nofollow: 제외 유지, 실제 권한 통제는 별도 검증 대상 |
| `/admin/components/` | noindex,nofollow: 제외 유지 |
| `/dashboard.html` | noindex,nofollow 및 robots 차단: 제외 유지 |
| `/feedback-admin/` | noindex, 관리자 화면으로 이동: 제외 유지 |
| `/footer-preview.html` | noindex, 미리보기: 제외 유지 |
| `/geoweb-battle/music-credits.html` | canonical·noindex 없음: 공개 출처 문서의 색인 정책 결정 필요 |
| `/googled418117a4754216f.html` | 검색 소유권 확인 파일: 보존, 사이트맵 불필요 |
| `/korean-spell-drill-parcyun/` | noindex,follow + `/spell-drill/` canonical + 이동: 이전 공유 주소 보존 |
| `/lab/globe/` | noindex,nofollow, 실험: 제외 유지 |
| `/mongdang-production-schedule.html` | noindex,nofollow 및 robots 차단: 제외 유지 |
| `/web-learning/` | 개인 로컬 실행 안내가 공개됨. canonical·noindex 없음: 아래 우선 권고 |

## 우선 권고와 아직 하지 않은 일

### 1. `/web-learning/` 공개 목적 확정

현재 개인 로컬 학습 서버 `http://127.0.0.1:4317/` 실행 안내다. 일반 방문자는 해당 서버를 사용할 수 없다. 개인 안내라면 noindex 및 공개 탐색에서 제외하는 것이 최소안이고, 공개 자료라면 독립적으로 읽을 수 있는 안내로 바꾼 후 canonical·사이트맵을 정한다. 현재 상태에서 무조건 사이트맵에 넣지 않는다. 데이터 유출이나 인증 취약점을 확인했다는 뜻은 아니다.

### 2. 배틀 음악 출처 문서 정책 통일

`/geoweb-battle/music-credits.html`을 검색 가능한 공개 출처 페이지로 유지한다면 canonical·사이트맵 포함을 검토하고, 보조 문서라면 noindex로 명시한다. 출처 문서가 공개되어 있다는 사실은 배틀 서버 가동의 증거가 아니다. 파일 삭제나 서버 재개는 불필요하다.

사이트맵은 검색엔진에 보내는 발견 신호이지 검색 노출 보장이 아니다([Google 공식 안내](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)). robots 차단·noindex는 비밀번호 같은 접근 통제가 아니므로 관리자 보호를 대신하지 않는다([Google robots 안내](https://developers.google.com/search/docs/crawling-indexing/robots/intro)).

## 이번 구현·검증과 재현

Dexterity 5개 페이지에만 `협업 문의` 문구를 적용했다. 공용 기본값인 다른 서비스의 `커피 사주기`는 유지한다. 바깥 좌우 여백은 20–48px, 푸터 안쪽 여백은 데스크톱 24px·모바일 16px. 320/390/1440px 브라우저에서 가로 넘침 없음, 하단 도킹 경계 차이 0px, 문의 버튼의 기존 모달 열림을 확인했다. 문의 메일은 발송하지 않았다.

재현: `npm run build` 후 `node scripts/audit-static-site.mjs --live`. 이 스크립트는 읽기 전용이며 페이지 JavaScript·방문자 증가 함수를 실행하지 않는다. 원시 JSON에는 38개 경로별 메타 정보와 HTTP 결과가 있다.

한계: 메타 정보·링크 검사는 로컬 빌드 HTML 기준, 라이브 검사는 HTTP 상태 기준이다. 동적으로 생성되는 전체 링크, 외부 서비스·API, 로그인/관리자 권한, iframe 내부, 실제 Google 색인·Search Console 상태, 실물 모바일 기기는 이번 전체 구조 감사로 검증하지 않았다. UI 레퍼런스의 실제 동작·픽셀 비교도 별도 검증이 필요하다.
