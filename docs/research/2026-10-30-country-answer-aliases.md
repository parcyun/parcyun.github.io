# GeoWeb 국가 답안 별칭 조사 (2026-10-30)

## 조사 범위와 재현 자료

게임 `COUNTRIES`의 195개 ISO2 전부를 REST Countries 원본 250개 레코드와 매칭했다(195/195, 누락 0). 기존 생성기와 동일한 commit을 사용하여 범위가 바뀌지 않게 했다. 각 레코드의 `name.common`, `name.official`, `translations.kor`, `altSpellings`를 검토 후보로 추출했다. [REST Countries 원본](https://gitlab.com/restcountries/restcountries/-/raw/43f6260db10c54df9972e6e554ee14c2e7c85ef5/src/main/resources/countriesV3.1.json)

같은 195개 ISO2를 Wikidata `P297`로 조회하고 한국어 `skos:altLabel` 151개를 수집했다. 이는 데이터셋 제작자가 제공한 원시 별칭이며, 별칭 각각의 지리학적 정확성을 보증하지 않는다. 자동 수입하지 않고 충돌·역사국가·정치적 표현·단순 오타를 제외했다. [Wikidata Query Service](https://query.wikidata.org/), [Wikidata 데이터 접근 및 CC0](https://www.wikidata.org/wiki/Wikidata:Data_access)

산출물은 `/Users/parcyun/Downloads/Codex/verification/capital-acceptance/`에 있다.

- `game-country-names.json`: 게임 195개 국가 기준 목록.
- `restcountries-source.json`: 고정 commit 원본.
- `country-alias-candidates.json`: 195/195 전체 후보와 한국어 통칭·정식명.
- `wikidata-ko-aliases.json`: 한국어 별칭 질의 응답(151 bindings).
- `approved-korean-aliases.json`: 수동 선별한 한국어 후보 144개, 83개 국가. 기존 통칭과 중복인 항목은 통합할 때 정규화해 제거할 수 있다.
- `korean-alias-exclusions.json`: 수입에서 제외한 후보 목록. 무관한 역사국가를 현재 국가의 정답으로 일괄 처리하지 않는다.

## 한국어 확인 근거

- 조지아/그루지아: 외교부 기록의 “조지아(구 그루지아)” 설명. [외교사료 공개 목록](https://diplomaticarchives.mofa.go.kr/new/publish/ebook/e-Book/catImage/32/PDF_download.pdf). 그루지야는 한국은행이 조지아 수도 트빌리시를 설명하며 사용하는 표기. [한국은행 소장 화폐](https://www.bok.or.kr/museum/singl/crrncySearch/view.do?crrncySn=8573&listType=G&menuNo=700127&pageIndex=5)
- 스와질란드/스와질랜드/에스와티니: 외교부 OPEN DATA의 SZ 레코드에 현재명 및 국명 변경 공식 요청 이력. [외교부 SZ](https://opendata.mofa.go.kr/core/resource/Country/SZ.page)
- 키르기즈·키르기즈공화국/키르기스스탄: 같은 외교부 경제 동향 본문에서 병기. [외교부 경제 동향](https://www.mofa.go.kr/www/brd/m_4049/view.do?page=1&seq=370860)
- 사이프러스/키프로스: 한국도로교통공단이 두 이름을 병기. [영문운전면허증 인정 국가](https://www.safedriving.or.kr/diGuide/selectDiGuide21Pop.do)
- 이디오피아/에티오피아: 외교부 공개 외교문서 목록에서 같은 문서에 두 표기 사용. 현재 표준 표기와 관계없이 과거 관용명 답안을 허용하는 근거로만 사용. [외교사료 목록](https://diplomaticarchives.mofa.go.kr/new/publish/ebook/e-Book/catImage/34/PDF_download.pdf)
- 세이셀/세이셸: 한국은행 화폐 레코드의 국가명과 중앙은행 설명에서 양쪽 표기 사용. [한국은행 화폐](https://www.bok.or.kr/portal/singl/crrncySearch/view.do?crrncySn=2136&listType=G&menuNo=200127&pageIndex=662)
- 벨로루시/벨라루스: KOTRA의 벨로루시 국가 안내 자료에서 주한 벨라루스 대사관을 소개. [KOTRA 자료](https://lib.kotra.or.kr/pyxis-api/1/digital-files/c16960f0-01ea-018a-e053-b46464899664)
- 불란서/프랑스: 대한민국 조약 제목과 영어 정식 국가명이 대응. [국가법령정보센터 조약](https://www.law.go.kr/trtyInfoP.do?trtySeq=1685)
- 버마/미얀마: 외교부가 “버마(현 미얀마)”로 설명. [외교부 보도자료](https://www.mofat.go.kr/www/brd/m_4080/view.do?page=247&pitem=10&seq=373834)
- 아프간, 인니, 이태리, 몽고, 타이, 우즈벡, 타지크, 투르크멘, 하야스탄, 사카르트벨로, 에이레, 바라트 및 각국 정식 한국어 국호는 Wikidata 원시 alias를 검토한 후보다. 별도의 정부 표준국명으로 주장하지 않는다.
- 조지자·튀르키에는 사용자가 명시한 허용 철자다. 공식 표기라는 주장 없이 정확 일치 별칭만 추가한다. 북한에 대한 조선 역시 사용자 명시 요청이며, 남한 정답으로 확대하지 않는다.

## 충돌 및 부정확한 후보 차단

- `콩고`는 현재 CG의 통칭이므로 CD에 공유하지 않는다. CD에는 콩고민주공화국/민주콩고/DR Congo/Congo-Kinshasa, CG에는 콩고공화국/Congo-Brazzaville처럼 구분되는 답안을 쓴다.
- BA에 Wikidata alias `BH`가 있으나 BH는 바레인 ISO2이므로 제외한다. ISO 코드와 국가명이 정규화된 뒤 다른 국가를 가리키는지 전수 검사해야 한다.
- `Korea`처럼 남·북한을 구분하지 않는 영어를 북한까지 확대하지 않는다. `조선`은 사용자가 지정한 KP 전용 허용값이다.
- 도미니카(DM)와 도미니카공화국(DO), 기니(GN)/기니비사우(GW)/적도기니(GQ)/파푸아뉴기니(PG), 수단(SD)/남수단(SS), 니제르(NE)/나이지리아(NG)를 별개로 유지한다. 단어 부분 포함이나 유사 철자만으로 맞히는 규칙은 도입하지 않는다.
- 잉글랜드/스코틀랜드/웨일스는 GB 전체 국가와 범위가 다르므로 추가하지 않는다. 기존 Britain/Great Britain은 기존 동작을 보존한다.
- 소련·유고슬라비아·체코슬로바키아·교황령·로디지아 등 사라진 국가나 범위가 달랐던 역사국가를 현대 국가와 동의어로 일괄 추가하지 않는다. 몰다비아는 이번 보수적 목록에서는 제외했다. 자이르·다호메이·실론·오트볼타는 아래 국명 변경의 연속성 근거로 허용한다.
- Wikidata의 키프로스 정치적 호칭, 니미비아 같은 비요청 오타, 이모지 별칭은 제외했다.
- REST Countries `altSpellings`도 무조건 승인할 수 없다. BN `the Abode of Peace`는 국호 조각, TH `Thai`와 TG `Togolese`는 형용사/주민명으로 모호하다. 이들은 자동 수입에서 제외한다. 국가명·정식명·확립된 약칭·같은 국가의 다른 표기로 한정한다.

## 검증 권고

모든 195개 국가의 기존 한국어/영어 통칭·정식명·ISO 답안이 유지되는지 검사한다. 새 별칭은 표기별 긍정 사례와 혼동 쌍의 부정 사례를 함께 검사한다. 표시 국명이나 문제 정답 표시는 변경하지 않고 허용 답안만 확장한다. 이는 전 세계 모든 역사명·방언·오타를 무제한 허용한다는 뜻이 아니다.

## 국명 변경 추가 확인

같은 UN 회원국의 명칭 변경으로 확인되는 이름은 허용할 수 있다. 제국의 광역 명칭이나 일부 구성국 이름과 구분한다.

- LK 실론/Ceylon → 스리랑카: [UN 회원국 도서관 안내](https://research.un.org/en/unmembers/currentmembers)는 Ceylon이 이전 국명임을 명시한다. [스리랑카 주재 UN](https://srilanka.un.org/en/about/about-the-un)도 현재 Sri Lanka와 과거 Ceylon의 UN 활동을 연속해서 설명한다.
- BF 오트볼타/상부볼타/Upper Volta → 부르키나파소: [UN 통계국 M49](https://unstats.un.org/unsd/methodology/m49/)가 동일 코드 854의 국명 변경으로 명시한다. [UN 조약 역사정보](https://digitallibrary.un.org/record/664189/files/2009-vol-2-english.pdf)에서도 이전명 Upper Volta를 확인할 수 있다. 한국어 두 표기는 영어 Upper Volta의 국내 관용 음역·번역이며 승인 목록에 함께 둔다.
- BJ 다호메이/Dahomey → 베냉: [베냉 정부 역사 안내](https://www.gouv.bj/pages/histoire/)가 Dahomey라는 이름으로 독립했다고 명시하며, [UN 조약 역사정보](https://digitallibrary.un.org/record/664189/files/2009-vol-2-english.pdf)가 베냉의 이전명을 명시한다. [외교부 문서](https://diplomaticarchives.mofa.go.kr/new/publish/ebook/e-Book/catImage/11/1975.pdf)는 “베냉(구 다호메이)”로 병기한다.
- CD 자이르/Zaire/Zaïre → 콩고민주공화국: [UN 회원국 페이지](https://www.un.org/en/about-us/member-states/democratic-republic-of-the-congo)와 [UN 공식 시소러스](https://metadata.un.org/skosmos/thesaurus/en/page/1001559)가 국명 변경 및 이전명을 명시한다.

이전 명칭을 답안으로 허용하더라도 화면의 현재 국명과 문제 데이터는 유지한다.

한국어 옛 국명 교차 근거: [한국학중앙연구원 부르키나파소 항목](https://encykorea.aks.ac.kr/Article/E0024150)은 오트볼타를 이칭으로 기재한다. [외교부 외교관계 수립 현황](https://www.mofa.go.kr/www/wpge/m_4181/contents.do)은 자이르(콩고민주)를 병기한다. 실론은 [국립중앙도서관 전거통제 연구](https://oak.go.kr/nl-ir/bitstream/2020.oak/277/1/%EA%B5%AD%EC%A0%9C%EB%AA%A9%EB%A1%9D%20%EB%8F%99%ED%96%A5%EC%9D%84%20%EB%B0%98%EC%98%81%ED%95%9C%20KORMARC-%EC%A0%84%EA%B1%B0%ED%86%B5%EC%A0%9C%EC%9A%A9%20%EA%B0%9C%EC%A0%95%28%EC%95%88%29%20%EC%97%B0%EA%B5%AC.pdf)에서 스리랑카의 이전 이름으로 상호참조한다. 이 PDF의 검색 노출 텍스트만 확인했으며 문서 본문을 별도 분석한 것은 아니다.

## 실제 반영 및 검증

- `src/components/geoCountryAliases.json`: 195개국 전체 키를 유지한 정적 데이터. 정규화해 중복 제거한 국명/별칭 1,426개를 검토했고, 기존 통칭·정식명·ISO·기존 별칭 대비 164개 국가에 신규 허용 표기 480개가 포함됐다. 별도 사용자 지정 철자도 기존 별칭 맵에 추가했다.
- 새 수입에서 `코리아`, `중화`, `합중국`, 형용사/국호 조각을 제외했다. 기존 미국 `아메리카` 별칭은 보존했다. 문자부호·공백 정규화 후 195개국 전체 정답 사이 충돌이 없음을 검사했다.
- 두 게임 모드(나라 이름/국기)에 동일 자료를 적용했다. 표시 국명은 바꾸지 않고 허용 답안만 확장했다. 수도는 각 언어에 저장된 복수 수도를 도시별 완전 일치 정답으로 추가하고, 영문 병기에서 누락된 La Paz/Colombo/Lobamba/Aden/East Jerusalem을 보완했다.
- 원본 및 정규화/충돌 검토 증거: `~/Downloads/Codex/verification/capital-acceptance/research/`. 런타임에는 외부 자료를 불러오지 않는다.
