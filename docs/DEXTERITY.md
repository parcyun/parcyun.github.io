# parcyun dexterity

이 지침은 Dexterity 갤러리와 게시글에 적용한다. 브랜드는 parcyun studio이며 MDBF와 섞지 않는다.

## 화면

- 좌측 상단에 `parcyun dexterity` 텍스트 로고를 둔다. Covered By Your Grace, 호박색 `#FFB11A`. 갤러리로 연결한다.
- 갤러리는 사진 중심으로 유지한다. 글이 없는 카테고리나 빈 카드는 만들지 않는다.
- 게시글은 브랜드 다크 배경 `#000000`과 흰색 글자, `#333333` 구분선으로 맞춘다. 밝은 화면 토글은 유지한다.
- 원본 글·사진·가격·장소 정보를 임의로 새로 쓰지 않는다. 사람을 비식별 처리한 기존 이미지도 유지한다.
- 사용자 요청에 따라 향미사 공간 사진 7장은 정방형으로 표시하고 사진별 object-position으로 천장·주변 여백을 조정한다. 원본 파일과 크게 보기 링크는 보존하며 메뉴판·원두표 2장은 자르지 않는다.
- ‘입구에서부터 커피 향이 좋았다.’ 같은 짧은 강조문은 본문보다 조금 크게(현재 22px)·600 굵기로 표현한다.
- 방문 카운터는 글 상단 우측에 둔다. ‘조회수’ 제목 없이 ‘오늘’과 ‘전체’ 사이 명시적인 gap을 둔다. 방문 증가·재방문 억제·한국시간 오전 6시 집계는 공용 카운터를 사용한다.
- 글 끝의 ‘사진 · parcyun / 인물 사진 AI 비식별 편집’ 문구는 노출하지 않는다. 그 자리는 라운드형 장소/지도 영역으로 사용한다.
- Naver Maps 일반 웹페이지는 외부 iframe을 차단한다. 이를 우회하거나 빈 iframe을 배포하지 않는다. 실제 삽입형 지도는 승인된 Maps API 설정으로 구현한다. 설정 전에는 네이버 지도에서 정확한 장소를 여는 카드와 주소를 제공하며, 이를 삽입 지도 완료라고 보고하지 않는다.
- 현재 삽입형 지도는 `public/dexterity-map.js`에서 Dynamic Map + Geocoding을 사용한다. 글 하단이 가까워질 때만 SDK를 불러오고 주소를 매번 조회한다. 결과 좌표·지도 타일을 별도 저장하지 않는다. Client ID는 공개용이며 Client Secret은 프런트엔드·리포에 넣지 않는다.
- Maps 앱 `parcyun-dexterity` 허용 환경은 `https://parcyun.github.io`와 로컬 검수 `http://127.0.0.1:62639`이다. 동적 지도는 일 1,000 / 월 20,000, 주소 검색은 일 1,000 / 월 3,000으로 제한하고 초과 사용은 허용하지 않는다. 콘솔의 ‘대표 계정 미설정’으로 무료 적용 여부는 확인되지 않았으므로 무료라고 단정하지 않는다.
- `Designed by parcyun studio`와 `@parcyun` 푸터를 유지한다.

## 댓글

- 입력 필드와 GitHub에서 이어 쓰기 버튼을 제공한다. 입력을 처음 시도하면 로그인 확인 안내 모달을 연다.
- 브라우저의 GitHub 쿠키를 읽거나 공개 API 응답으로 방문자의 로그인 상태를 추정하지 않는다.
- 현재 방식은 GitHub Issues 댓글로 이어지는 안전한 외부 작성 흐름이다. 로그인 확인·실제 등록은 GitHub가 담당한다. 본 사이트에서 즉시 제출/로그인 상태 판정이 필요하면 별도 OAuth 서버 작업으로 다룬다.
- 입력은 모달을 닫아도 보존한다. 필요한 경우 사용자 동작으로 복사한다. 자동 댓글 게시나 비공개 토큰을 브라우저에 추가하지 않는다.
- 댓글 API의 내용을 textContent로 표시하고 빈 목록·호출 실패를 안내한다.
- 모달은 native dialog, 닫기·Escape·초점 복귀를 제공한다. 키보드 포커스 표시는 유지한다.

## 원격 작업·배포

- 정식 리포는 `parcyun/parcyun.github.io`, 공개 경로는 `/dexterity/`와 `/dexterity/hyangmisa/`이다.
- 집의 맥북에서 시작하기 전 `git status`, `git fetch origin`으로 로컬 작업과 원격을 확인하고, 깨끗한 main에서는 `git pull --ff-only origin main`을 사용한다. 미커밋 작업이 있으면 덮어쓰거나 강제 리셋하지 않는다.
- 화면 공통 스타일은 `public/dexterity.css`, 댓글 동작은 `public/dexterity-comments.js`에 있다.
- `npm run build` 후 `node --test test/dexterity.test.mjs test/dexterity-enhancements.test.mjs`를 실행한다. 모바일·데스크톱에서 로고, 글 상단 수치, 마지막 장소 카드, 댓글 모달을 확인한다.
- 푸시 성공과 라이브 반영은 별개다. GitHub Pages Actions 성공 및 공개 URL을 확인하고, 실제로 확인한 범위만 보고한다.
