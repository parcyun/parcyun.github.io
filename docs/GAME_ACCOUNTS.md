# 게임 계정 연결

## 배포 구성

- Google Cloud / Firebase 프로젝트: `parcyun` (`1093702239224`).
- 로그인: Firebase Authentication / Google 공급자, 공개 이름 `parcyun studio`.
- 허용 도메인: `parcyun.github.io`, `parcyun.firebaseapp.com`, `parcyun.web.app`, `localhost`, `127.0.0.1`.
- 프로필: Firestore `(default)`, 서울 `asia-northeast3`, `profiles/{Firebase UID}`.
- 별명·선택 학교·선택 사진·수정 시각만 프로필 문서에 저장. Google 실명을 기본 별명으로 복사하지 않는다.
- 프로필 사진은 브라우저에서 128×128 WebP로 변환해 저장한다. 외부 업로드 버킷은 사용하지 않는다.
- 게임 기록은 기존 브라우저 저장 방식이다. 로그인 기능은 점수 동기화나 공개 순위표를 포함하지 않는다.
- Firebase 웹 API 키와 앱 ID는 공개 클라이언트 설정이다. 비공개 관리 자격 증명은 사이트에 포함하지 않는다.

## 서버 접근 제한

`firebase/firestore.rules`는 본인 프로필만 조회·생성·수정·삭제할 수 있게 한다. 컬렉션 목록과 다른 경로는 허용하지 않는다. 필드 목록·자료형·길이·수정 시각을 서버 규칙에서 검사한다.

규칙 재배포: 인증된 Mac에서 `node scripts/deploy-game-profile-rules.mjs` 실행. 스크립트는 `gcloud`의 현재 로그인 자격으로 `parcyun`에만 배포한다.

## UI와 가이드

- `public/game-account.js`: 두 게임의 캐릭터 메뉴·Google 로그인·프로필 수정·약관 링크.
- `public/service-guide.js`: 기존 개발자 인사에 캡처 가이드를 추가. 마지막 페이지도 이전/다음 유지, 다음 비활성화.
- `public/images/guides/`: 실제 게임 화면 캡처. 관련 기능이 바뀌면 캡처를 교체한다.
- 약관: `/terms/`, 개인정보처리방침: `/privacy/`. 신규 개인정보 항목을 저장하기 전에 실제 처리 방식과 함께 갱신한다.

## 확인 기록 (2026-10-29)

- Google 공급자 활성화와 사이트 도메인 허용 완료.
- Google 인증 플랫폼 공개 대상이 외부·프로덕션 상태임을 콘솔에서 확인.
- Chrome의 실제 Google 로그인 성공, 무작위 별명·128px 변환 사진 저장 및 새로고침 후 프로필 재조회 확인.
- 로그인 없는 프로필 API 조회는 HTTP 403.
- 한글/영어 홈의 제목·컨트롤·전체 높이 동일함을 브라우저에서 측정.
- 390px 화면에서도 한글/영어 홈 높이와 컨트롤 높이가 같고 가로 넘침이 없음을 확인. 스튜디오 메뉴의 공유·커피는 데스크톱 좌우, 모바일 공유 위·커피 아래로 배치.
- 인앱 브라우저의 인증 팝업은 별도 창 추적이 제한되어 Chrome에서 인증을 검증했다. 기본 게임 이용은 로그인에 의존하지 않는다.
