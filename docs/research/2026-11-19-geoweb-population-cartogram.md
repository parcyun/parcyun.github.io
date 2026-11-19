# GeoWeb 인구 비례 지도 참고·생성 검증 (2026-11-19)

## 참고한 실제 사례와 선택

- [Worldmapper FAQ](https://worldmapper.org/faq/): 나라 면적을 전체 인구 중 비중으로 바꾸는 카토그램을 사용한다. 인구밀도와 달리 인구수처럼 합산 가능한 양을 면적에 대응시킨다. 기존 지도 이미지는 CC BY-NC-SA 4.0이므로 그대로 제품 자료로 복제하지 않고 시각적·방법론적 참고로만 사용했다.
- [Mark Newman의 실제 세계 인구 카토그램](https://public.websites.umich.edu/~mejn/cartograms/): 인도·중국이 커지고 캐나다·러시아가 작아지는 사례, 나라 색을 일관되게 유지하는 방식과 변형된 격자선을 참고했다. 이 이미지도 자유로운 상업 재사용 자료로 간주하지 않았다.
- 실제 좌표는 [go-cart-wasm 0.5.0](https://github.com/riatelab/go-cart-wasm)으로 별도 생성했다. [Gastner·Seguy·More (2018)](https://doi.org/10.1073/pnas.1712674115)의 연속형 flow-based 알고리즘이며, 원본과 결과의 꼭짓점 순서가 같아 GPU 보간에 적합하다. 최신 C++ 후속 구현은 AGPL-3.0이라 이번 빌드에 포함하지 않았다.

## 자료와 투영

- 인구: [OWID Population CSV](https://ourworldindata.org/grapher/population.csv)의 **2023년** 행. [metadata](https://ourworldindata.org/grapher/population.metadata.json)는 이 기간 자료를 UN World Population Prospects 2024로 명시한다. 관측 연도를 통일했으며 최신 실시간 인구라는 뜻은 아니다. 원 CSV SHA256을 생성 결과에 기록했다.
- 경계: 기존 Natural Earth 기반 `world.json`. 256개 경계 feature 중 같은 이름의 분리된 경계를 합쳐 253개 그룹으로 계산한 뒤 원 순서로 되돌린다. 이 중 인구 자료가 연결된 그룹은 229개, 연결되지 않은 그룹은 24개다. ISO/OWID 이름 연결은 명시적 별칭만 사용한다.
- [WASM README](https://github.com/riatelab/go-cart-wasm#usage)는 경위도에 바로 계산하면 잘못된 면적이 된다고 설명한다. 입력은 원통 등적 좌표 `x=longitude radians`, `y=sin(latitude)`이고, 계산 결과 전체에 **공통** 배율·이동을 적용한 후 다시 경위도로 변환했다. 국가별로 따로 정규화하지 않는다.
- 경계는 최대 1° 간격으로 먼저 세분했다. 각 꼭짓점은 `[원본 경도, 원본 위도, 변형 경도, 변형 위도]`이며 ring/feature 대응을 검증한다. 추가 내부 정점은 동일 변형장의 보간이 필요하다.

## 작은 지역과 불확실성

업스트림 WASM은 원래 C 구현의 `use_perimeter_threshold=TRUE`를 고정해 작은 지역을 의도적으로 확대한다. 그래서 기본 설정은 정확한 인구 비례가 아니다. 오프라인 생성기는 버전과 WASM SHA256을 고정하고, 유일한 초기화 명령의 바이트 하나를 바꿔 이를 FALSE로 설정한다. 원본 MIT C 프로그램의 `-n`과 같은 옵션이다. 수정 전후 차이는 1바이트이며 WASM 검증기를 통과했다. 브라우저에 계산기/WASM을 배포하지 않는다.

수정 후 최종 반올림 좌표에서 계산한 **인구 가중 평균 절대 면적 오차는 약 0.114%**다. 인구 100만 이상 지역의 가장 큰 오차는 에스토니아 약 -2.51%, 라트비아 +2.37%, 키프로스 -1.44%다. 인도·중국·한국 등 큰 인구 지역은 훨씬 작다. 그러나 그린란드·니우에·몰디브·모나코 같은 작은 목표 면적은 격자 해상도·수렴 한계로 오차가 크다. 개별 `properties.areaError`는 최종 좌표에서 재계산한 오차이며 `solverAreaError`는 계산기 자체 보고값이다. 전체 지역에 오차 1% 이하라고 주장해서는 안 된다.

남극과 연결되지 않은 지역의 인구는 `null`이다. 이를 인구 0이나 임의 추정치로 표시하지 않는다. 이들은 연속 변형을 위한 별도 배경 면적 가중치를 쓰며 지도에서는 미확인 지역으로 구분한다. 2023 UN 통계의 지역 정의와 기존 경계의 해외영토·분쟁 지역 구분이 완전히 일치한다는 보장도 없다.

면적 비례는 계산의 **등적 평면** 기준이다. 이를 다시 메르카토르·렌즈·지구본으로 보여주면 각 투영과 원근에 따른 화면 면적 차이가 생긴다. 세 뷰에서 모양이 일관되게 변형된다는 뜻이지, 세 화면 모두에서 픽셀 면적이 정확히 인구에 비례한다는 뜻은 아니다.

## 생성·재현

1. npm `go-cart-wasm@0.5.0` tarball을 추출한다. 앱 실행 의존성으로 추가할 필요는 없다.
2. 위 CSV를 내려받는다.
3. `GO_CART_PACKAGE=/path/to/package node scripts/build-population-cartogram.mjs /path/to/population.csv`를 실행한다.
4. 결과: `public/lab-data/geoweb-population-cartogram.json`. 출처·연도·좌표 형식·알고리즘·매칭 범위·개별 오차가 포함된다.

패키지 wrapper MIT와 core modified MIT의 고지문, 논문 인용 조건은 `public/lab-data/GEOWEB_POPULATION_ATTRIBUTION.txt`에 보존했다. 로컬 개발 자료이며 라이브 배포는 수행하지 않았다.

## GeoWeb local implementation and observed QA
- Local worktree: `codex/geoweb-population-local-20261119`; dev URL `http://127.0.0.1:47613/world-map/`. No live push is included in this task.
- The main population toggle morphs every country together using shared precomputed endpoints in all three projection views. A conditional country-selection toggle on its right restores the ordinary map and overlays only the selected country's cartogram shape in green.
- Country hit testing uses the currently animated planar outlines, including polygon holes; spherical containment was unsuitable for the severely distorted rings and could select Norway when clicking West Africa. A regression checks the reported West-African point selects Ivory Coast. Map selections also clear stale search results.
- All country-fill layers use explicit front-side clipping without globe depth testing: long triangular faces otherwise sagged behind the ocean sphere and left large holes. The current view and selection are reapplied after asynchronous scene initialization so local hot reload does not show a flat renderer under a globe-mode label.
- Removed the extra grid heading. Toolbox width/height animate for climate/landform toggles and language changes; reduced motion bypasses that animation. Observed toolbox dimensions: Korean basic292×537; climate expanded292×620; English expanded429.5×620. The immediately sampled climate transition retained the old537px height before settling, rather than jumping.
- Browser checked flat, Focus Lens and globe population rendering, country-only India overlay, West Africa selection, climate/landform and language toggles. Globe holes were reproduced before the fill-depth fix and visually absent afterwards. Targeted tests23/23 and production build21pages passed. Screenshots and logs are stored separately in the local population verification artifacts.
- Final clean-session verification also covered the India-only overlay in Focus Lens and full-map globe rendering after the depth correction; both were captured without the previously observed large land holes. A real West-African map click returned Côte d'Ivoire and its2023 population rather than Norway. Source/map selection now clears the old search-country fact panel.
- Morph follow-up: removed the opacity cross-fade of the stationary raster base/overlay. As soon as country vertices start moving, only the opaque vector country faces and their matching moving borders remain; the identical raster fallback returns only after the geometry has fully returned to its original positions. Forward/backward local transitions were checked;23 targeted tests and the21-page build still pass.

## 북아시아 극지 왜곡 수정

후속 검수에서 CEA 역변환 asin(Y) 다음 Mercator 표시가 atanh(Y)를 만들어 고위도 변화를 증폭하는 문제가 확인되었다. 전체 국가에 공통으로 targetLat=atan(sinh(Y))를 사용해 평면 렌더링이 계산 평면 Y를 정확히 복원하도록 수정했다. QA도 실제 표시 평면의 Mercator 역복호화 좌표로 계산한다. 러시아만 별도로 압축하지 않아 공유 경계와 국가 간 비례를 유지한다. 세부 원문 근거는 `2026-11-19-geoweb-cartogram-north-review.md` 참조.

인구 보기 활성화 시 위쪽 국가 선택과 개별 국가 비교 모드를 자동으로 켠다. 국가 선택을 끄면 전체 인구 지도 및 대륙 정보 선택으로 돌아간다. 로컬 실제 UI에서 자동 켜짐, 세 가지 뷰, 밀도 겹침을 확인했고 극지 회귀 검사 포함 21개 및 빌드를 통과했다.
