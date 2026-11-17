# Spell Drill 대항전

2026-11-17 라이브 구현. 정적 화면은 기존 GitHub Pages 배포를 사용하고 방 API는 Cloud Run `parcyun / asia-northeast3 / spell-drill-battle`을 사용한다. API 주소는 `public/spell-drill/battle/config.json`에 있다.

## 동작

- 브라우저 프로필 또는 Google 로그인 확인 후 입장한다. 라이브 API는 Firebase ID 토큰을 검증하고 6시간 유효한 대항전 세션을 발급한다. 브라우저 프로필은 UID와 프로필 버전별로 구별하며, 방에 입장한 시점의 별명을 저장한다. 별도의 서버 프로필을 만들거나 연동하지 않는다.
- 게임을 만들 때 팀전과 개인전을 선택한다. 진행자는 플레이어에 포함되지 않는다. 팀전은 2~10개 팀을 설정하고 참여자는 인원이 적은 팀 중 무작위로 배정된다. 진행 전 팀 이동·내보내기·팀 수·난이도·시간·라운드를 설정한다. 이동한 사람은 팀 목록 맨 아래로 간다.
- 개인전에는 팀 정보·팀 이동·팀 이름이 없다. 전원이 같은 난이도·시간·라운드로 플레이하며 개인별 점수와 순위를 집계한다. 진행자는 개인별 실시간 리더보드, 참여자는 자기 누적 점수와 종료 후 개인 순위를 본다.
- 팀의 첫 번째 참여자가 팀 이름을 바꾼다. 준비 완료한 참여자의 카드는 잠기고 팀원 전원이 준비하면 팀 이름도 잠긴다. 설정이 바뀌면 준비가 취소된다. 참여자 두 명 이상, 전원 준비 후 시작한다.
- 진행자는 실시간 팀 리더보드, 참여자는 자기 팀과 답안 화면을 본다. 순위 변경 시 카드가 이동하며 1위는 큰 호박색 카드로 표시된다. 라운드 사이 5초 후 자동으로 다음 라운드가 시작된다.
- 팀 상자는 상단 강조선 없이 테두리와 내부 배경색으로 구분하고, 순위가 바뀌어도 팀별 색을 유지한다.
- 점수·정답·제출 중복·제한 시간·권한은 서버에서 판정한다. 방 상태와 서명 키는 클라이언트 접근이 차단된 Firestore 컬렉션에 저장한다. 방은 24시간 만료되며 `expiresAt` TTL로 삭제된다.

## 로컬 실행 및 배포

```sh
cd server/spell-battle
npm ci
npm start
```

`http://localhost:47820/spell-drill/`. 로컬 실행은 메모리에 방을 보관하고 브라우저 프로필 확인을 로컬에서 수행한다. 재시작하면 방과 세션이 초기화된다. Google 로그인은 ID 토큰을 확인한다.

클라우드 소스 준비(명시한 출력 폴더에 생성):

```sh
node scripts/build-spell-battle-context.mjs ~/Downloads/Codex/verification/spell-battle/cloud
gcloud run deploy spell-drill-battle --project parcyun --region asia-northeast3 --source ~/Downloads/Codex/verification/spell-battle/cloud --service-account spell-battle@parcyun.iam.gserviceaccount.com --allow-unauthenticated --min-instances 0 --max-instances 3 --memory 512Mi --cpu 1 --concurrency 40 --timeout 60
```

런타임 서비스 계정은 Firestore 접근용 `roles/datastore.user`만 사용한다. `public/game-account.js` 하단의 `psBattleIdentity`는 기존 계정 확인 기능을 공유한다. 문장 데이터는 기존 Spell Drill의 `SENTENCES`에서 생성하므로 수정 시 API도 재배포한다.

## 검증 및 남은 확인

- 도메인 테스트 5개 통과: 배정·이동 순서·권한·내보내기·시간·라운드·중복 제출·준비 잠금·팀 이름·팀 수·참여자에게 자기 팀만 공개·개인전 공통 설정과 개인별 점수.
- 실제 로컬 UI: 프로필 생성, 팀전·개인전 방 생성·참여, 10개 팀 2행, 드래그, 팀 이름, 준비, 점수 제출, 리더보드 순위 이동, 종료 결과, 모바일 레이아웃 확인.
- 실제 Cloud Run: Firebase 임시 계정으로 팀전·개인전 입장·권한·준비·시작·정답·중복 방지·종료·QR·CORS 확인. 개인전에는 팀이 없고 동일 난이도·종료 시간을 적용하며 개인 점수가 독립 집계됨을 확인했다. 테스트 방과 임시 계정 삭제 완료.
- Astro 빌드 통과. 전체 테스트 중 기존 연락 API 의존성 미설치와 홈 Dexterity 링크의 편집 ID 누락은 대항전 범위 밖이며 변경하지 않았다.
- 미검증: 실제 휴대폰 카메라로 QR 참여, 실제 Google 로그인 팝업 경로, 여러 학급 동시 부하. 다음 확인: 라이브에서 진행자 1명과 참여자 2명으로 한 경기 진행한 뒤 기기별 QR·로그인을 확인한다.
