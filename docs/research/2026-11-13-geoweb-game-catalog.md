# GeoWeb 게임 자료 확장 · 2026-11-13

## 적용 결과

- 실제 출제 가능한 랜드마크 100 → 348종, 자연환경 52 → 156종. 초급은 기존 대표 자료, 고급은 추가 자료로 구성한 교육용 편집 분류이며 인지도 통계가 아니다.
- 게임에 쓰이는 사진은 랜드마크 920장, 자연환경 338장. 항목별 1–3장의 서로 다른 파일을 연결하고 2초 간격으로 순환한다. 모든 항목에 사진이 있으며, 실제 자료가 부족한 곳에 다른 장소의 사진을 복제하지 않는다.
- 사진마다 Commons 파일 원본·저작자·라이선스·라이선스 URL을 저장하고 현재 표시 사진에 맞춰 크레딧을 바꾼다. 지도/로고/위치도 후보를 제외했다. 브라마푸트라와 멕시코 고원은 별도로 실제 강/고원 풍경 사진을 선정했다.
- 랜드마크 덱은 국가별 남은 문항 수를 고려해 직전 국가를 제외한다. 덱 경계에서도 같은 나라가 이어지지 않는다. 초급·고급에 각각 충분한 국가가 있다.

## 이름과 정답

Wikipedia의 한국어 문서 연결·Wikidata 한국어/영어 별칭을 자료별로 수집하고 명시적 정답 목록에 추가했다. 부분 문자열이나 무제한 오타 유사도 판정은 사용하지 않는다. 조사한 원 문서 URL은 각 자료의 `researchSource`, 추가 편집 별칭은 `geoGameAliases.json`에 있다.

- 베이징시/평양시/서울특별시/쿠웨이트 시: 행정 접미사가 확인된 항목만 도시 이름을 추가한다. 트빌리시 → 트빌리 같은 잘못된 축약은 거절한다.
- 황허/황하, 양쯔/양자강/장강, 티베트/티벳, 화베이/화북, 캅카스/코카서스, 다뉴브/도나우 등 기존 명칭과 통용 표기를 함께 허용한다.
- 중국 명소: 자금성/구궁/고궁박물원, 천단/톈탄, 이화원/이허위안, 러산대불/낙산대불, 룽먼석굴/용문석굴, 막고굴/모가오굴, 황학루/황허러우, 악양루/웨양루 등.
- 발음 예시: 콜로세움/콜로세오, 몽생미셸/몽생미셀/몽생미쉘, 부르즈할리파/버즈칼리파 등. 실제 다른 명소와 혼동되는 추측이나 무조건 짧은 이름은 추가하지 않는다.

공식 베이징 관광망도 구궁(자금성 고궁박물원), 텐탄(천단공원)을 병기한다: [관광지](https://kr.visitbeijing.com.cn/attractions?area=1&theme=1).

## 지형과 강

Natural Earth 50m 기존 영역과 10m 지형/하천 원본을 사용한다. 기존 대표 지형을 보존하고 추가 영역은 실제 원본 폴리곤을 사용한다. 강은 14 → 42종이다.

동일한 강의 원본 구간 끝점을 0.03도 이내에서만 연결하고, 가장 큰 연결 성분에서 연속된 주 물길을 추출해 단일 LineString으로 저장한다. 서로 떨어진 조각을 긴 직선으로 잇거나 무관한 지류를 만들어 넣지 않는다. 한국 한강은 동명의 중국 한수와 섞이지 않도록 한반도 원본 구간만 선택한다. 이는 교육용 일반화 지도이며 모든 지류·상류의 전수 표시가 아니다.

출처: [Natural Earth 데이터](https://www.naturalearthdata.com/downloads/10m-physical-vectors/), [공공영역 이용 조건](https://www.naturalearthdata.com/about/terms-of-use/), [원본 지역](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_regions_polys.geojson), [원본 하천](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_rivers_lake_centerlines.geojson).

## 기록·배포 경계

- 기존 로컬 기록과 `nature`/`landmark` 레거시 랭킹을 유지한다. 신규 초급/고급은 별도 보드에 저장하며 기존 사용자 점수를 일괄 수정하지 않는다.
- pen.layered Google 계정 또는 같은 표기의 프로필이 새 기록을 제출하면 공개 소속 필드는 `DEXTER 개발자`로 저장된다. 이메일은 공개 기록에 저장하지 않는다.
- Firestore 규칙은 기존 인증·소유권·허용 필드·점수 검증을 유지하고 자연환경/랜드마크의 easy/hard 보드 이름만 추가한다. 배포 전 실제 운영 규칙이 저장소 기준과 같은지 비교하고 이전 규칙 버전을 보관한다.
- Battle 로컬 실험은 이 배포에 포함하지 않는다. 최신 원격 main의 별도 작업 사본에서 공개 GeoWeb만 수정한다.

## 재현

`GEOWEB_SOURCE_CACHE`에 원본·공개 API 메타데이터를 캐시한다. 수집 스크립트는 공개 API만 읽으며 인증 세션/쿠키를 사용하지 않는다.

1. `scripts/expand-geogame-catalog.mjs`: 기존100 + 추가 후보의 문서/별칭/사진 라이선스 수집.
2. `scripts/expand-geogame-nature.py SOURCE_DIR`: Natural Earth 원본에서 지형·연속 하천 생성 (사진 부족 후보를 제외할 수 있게 초과 후보 생성).
3. `scripts/expand-geogame-nature-media.mjs`, `scripts/curate-geogame-photos.mjs`: 사진 메타데이터 수집 후 지도·도표·전시물 등 부적절한 후보 제거.
4. `scripts/finalize-geogame-catalog.mjs`: 실제 풍경 사진이 있는156항목 확정.

이번 원본·API 캐시·수집 로그·규칙 백업·검증 기록은 `/Users/parcyun/Downloads/Codex/Artifacts/geoweb-content-20261113/`에 보관한다.

## Follow-up: account exception, photo cache and round visibility
- Reserved developer names are allowed only for the verified developer Firebase UID in both client submission/profile validation and Firestore rules. Email prefixes and copied aliases do not grant an exception. Existing score ownership and best-record comparisons remain unchanged.
- Photos warm progressively before entering a game, with two concurrent image loads and browser HTTP caching. Selected carousel photos remain visible until their replacement loads; slides cross the half-screen lane and fade at its boundary, including the screen centerline. Reduced motion disables slide movement.
- Active rounds finish once when the document becomes hidden. Returning cannot resume the round; ten child-friendly messages are chosen randomly. This is a client-side deterrent, not proof of cheating; accidental tab changes and minimizing can also finish the round. Other devices and client tampering are not prevented.
- Verification: reserved-name developer and impostor regression checks, cache concurrency/deduplication/retry checks, visibility lifecycle and ten-message selection checks; 45 targeted tests and production build. Local real UI confirmed three-photo cycling and the lane begins exactly at half the viewport. Real authenticated developer submission was not performed in the anonymous browser session. IAB background tabs remain visible to the page, so the real visibility transition is covered by event lifecycle tests rather than a simulated browser mutation.

## Personal record submission follow-up
- MY BEST RECORD displays the server-submitted best for the selected game and difficulty; each selection loads its own board. Pending rounds are separate rounded green cards above this panel.
- Scored rounds retain the best unsubmitted candidate per game/difficulty in `geoweb.pending-records.v1` localStorage. Full score, duration, combo and original play timestamp survive reload. A successful submission acknowledges only that candidate; a newer pending improvement is not removed, and failed submissions preserve the record. Existing historical score-only local records are not converted into fabricated submission records.
- A confirmed transaction result determines whether the personal best improved (higher score, then shorter time for ties). Successful submission flashes and merges the pending card into the best panel. Confirmed improvements show a green center message for three seconds, then shrink toward a blinking badge beside the best label. Reduced motion removes flashing, movement and blinking.
- Verified with unit tests for reload, board separation, tie comparisons, corruption, acknowledgement and transaction improvement. Local browser fixture verified selection switching, refresh persistence, submission, centered celebration, blinking badge and disappearance of acknowledged records after reload. The fixture uses a fake local server adapter; no test record was published to the real leaderboard. Fixture retained only in the external verification artifacts, not production routes.

## Compact record feedback for GeoWeb and Spell Drill
- Pending cards now overlay the list above MY BEST RECORD without reserving list space. Handles are pinned to the sheet's top edge; headings/disclosures use tighter top alignment and compact single-line notices.
- Both products use the same `/record-feedback.js` motion controller: 700 ms center display, then 320 ms movement. The moving text is exactly `경신!`, matching the destination badge. Its translation and both scale axes come from the actual source/destination DOM rectangles. The prefix fades separately, leaving the same green glyphs at the badge. Reduced motion skips the flight and flashing.
- Spell Drill also retains best pending submissions by language/difficulty/mode across reloads, with acknowledgement only after a successful server submission. The result-page submission action opens the selected ranking board for the same floating-card flow. The selected board's server best remains separate.
- Local browser fixtures for both products verified floating cards, compact headers, submission disappearance and the final blinking badge. GeoWeb's list top was unchanged at 161.195 px before/after the card disappeared. Shared-motion tests verify exact endpoint center/width/height, timing and reduced motion; Spell persistence tests cover board isolation and faster-tie acknowledgement. Browser fixtures use fake local submission adapters and are retained only outside the deployed tree.
