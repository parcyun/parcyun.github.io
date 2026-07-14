# 기능 개선 요청 게시판 설계

## 목표

메인·Geoweb·맞춤법 게임의 하단 브랜드 푸터에서 기능 개선 요청을 받고, 관리자가 승인한 글만 공개 목록에 보이도록 한다.

## 구성

- `feedback-board.js`: 모든 사이트 형식(Astro·정적 HTML)이 공유하는 모달, 작성, 공개 목록, 공감 UI. 모달은 반투명 블러 배경을 사용하고 Escape·바깥 클릭으로 닫는다.
- `PsFooter.astro`와 `WorldMapFooter.astro`: 공용 플로팅 브랜드 pill에 요청 버튼과 위젯 스크립트를 추가한다.
- 맞춤법 게임: 독자 `.ps-footer` pill을 공용 브랜드 pill의 위치·서체·구분선·커피/Instagram 구성에 맞추고 위젯을 불러온다.
- `feedback-admin.astro`: 기존 `/admin` 비밀번호 세션을 재사용해 대기 글을 승인·반려한다.

## 데이터와 접근 제어

- `feedback_posts`: 본문, 원본 경로, 상태(`pending`/`published`/`rejected`), 작성·공개 시각을 보관한다.
- `feedback_votes`: `(post_id, voter_id)` 유일 키로 브라우저별 공감 1회를 보장한다. `voter_id`는 브라우저 localStorage의 무작위 토큰이다.
- 테이블은 RLS를 활성화하고 정책을 만들지 않는다. 공개 작성·공개 목록·공감·관리자 검토는 입력 범위를 제한한 RPC로만 수행한다.
- 공개 목록과 공감 대상은 `published` 상태만 허용한다. 새 글은 항상 `pending`으로 시작한다.

## 검증

- 단위 테스트로 공개 목록 요청, 대기 상태 제출, 공감 토글, 관리자 세션 동작을 검증한다.
- Supabase에서 RPC의 상태 전이와 공개 조회 제한을 SQL로 확인한다.
- Astro 빌드와 GitHub Pages 배포 후 메인·세계 지도·맞춤법 게임에서 공용 푸터와 모달 로드를 확인한다.
