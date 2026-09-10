# GeoWeb 세계 기후 레이어 자료 조사

조사일: 2026-09-10

## 권장 결론

현재의 위도 띠 + 수기 다각형을 없애고, 다음 원자료를 오프라인에서 한 장의 로컬 팔레트 PNG로 전처리한다.

1. 기후 5종: Beck et al. (2023) Köppen–Geiger 1991–2020 관측 기반 지도
2. 고산 1종: USGS Global Mountains K3 산지 마스크 + NOAA ETOPO 2022 고도

이 조합은 열대·건조·온대·냉대·한대의 실제 불규칙한 경계를 반영하고, Köppen–Geiger에 독립된 `H` 분류가 없다는 한계를 숨기지 않으면서 사용자가 요구한 고산 영역을 일관된 세계 산지 자료로 보완한다.

## 1. 기후 5종 원자료

- 자료: **High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections**, Beck et al. (2023)
- 권장 시기: `1991_2020` (가장 최근의 역사·관측 기반 30년 평년값)
- 권장 해상도: `0p1` (0.1°, 3600 × 1800). 현재 GeoWeb 4096 × 2048 등장방형 텍스처에 충분하고 원본 1 km 자료보다 배포 용량이 훨씬 작다.
- 원본 형식: 팔레트 GeoTIFF, 8-bit 값 1–30, 바다/무자료 0
- 정확한 파일: `1991_2020/koppen_geiger_0p1.tif` (ZIP 내부 216,858 bytes)
- 전체 내려받기: <https://ndownloader.figshare.com/files/61012822> (`koppen_geiger_tif.zip`, 약 124.6 MiB)
- Figshare 레코드와 메타데이터 API:
  - <https://figshare.com/articles/dataset/High-resolution_1_km_K_ppen-Geiger_maps_for_1901_2099_based_on_constrained_CMIP6_projections/21789074>
  - <https://api.figshare.com/v2/articles/21789074>
- 원저자 안내: <https://www.gloh2o.org/koppen/>
- 논문 DOI: <https://doi.org/10.1038/s41597-023-02549-6>
- 라이선스: **CC BY 4.0**. 수정·재배포 가능하되 Beck et al. (2023) 출처 표기가 필요하다. GloH2O도 동일 조건을 명시한다.

### 6개 초등 범주 변환

원본 `legend.txt`의 첫 글자 그룹을 다음처럼 합친다.

| GeoWeb | Köppen–Geiger 값 | 원본 대분류 |
|---|---:|---|
| 열대 | 1–3 | A: Af, Am, Aw |
| 건조 | 4–7 | B: BWh, BWk, BSh, BSk |
| 온대 | 8–16 | C: Csa–Cfc |
| 냉대 | 17–28 | D: Dsa–Dfd |
| 한대 | 29–30 | E: ET, EF |
| 고산 | 아래 USGS 산지 마스크로 덧씌움 | Köppen–Geiger에는 독립 H 값 없음 |

`0`은 투명하게 둔다. 원본 30개 세부형의 둘째·셋째 글자는 버리고 첫 글자만 사용하므로, 지도와 범례에는 `초등 학습용 6개 범주로 재분류`라고 표시한다.

## 2. 고산 보완 원자료

- 자료: **USGS Global Mountains K3**, DOI <https://doi.org/10.5066/P9O035QJ>
- 설명·라이선스 근거: <https://www.usgs.gov/centers/geosciences-and-environmental-change-science-center/science/global-ecosystems-global-data>
- 메타데이터: <https://www.sciencebase.gov/catalog/item/638fbf72d34ed907bf7d3080>
- 권장 파일: `GlobalMountainsK3Binary.zip`, 약 43.2 MiB
- 내려받기: <https://www.sciencebase.gov/catalog/file/get/638fbf72d34ed907bf7d3080?name=GlobalMountainsK3Binary.zip>
- 형식: 250 m(7.5 arc-second) 세계 산지 이진 BigTIFF. ZIP 안 실제 파일은 `k3binary.tif`이며 산지는 값 `1`, 나머지는 NoData이다. `k3binary.tfw`가 함께 들어 있다.
- 라이선스: USGS 페이지가 **Public Domain**으로 명시한다.

K3는 250 m DEM과 Hammond 지형형을 이용한 산지 경계다. 산지와 고산 기후는 완전히 같은 개념이 아니므로, 구현에서는 NOAA ETOPO 2022 고도 1,500 m 이상인 K3 산지만 고산으로 표시한다. 남위 60° 이하와 북위 66.5° 이상의 극지는 Köppen 한대로 유지한다.

> 기후 5종은 Beck et al. (2023), 고산은 USGS 세계 산지와 NOAA 고도 자료를 결합한 초등 학습용 분류입니다.

고산은 Köppen–Geiger의 독립 대분류가 아니므로 이 결합은 교육용 운영 정의다. K3만 쓰면 낮은 산지까지 과도하게 표시되고, 고도만 쓰면 넓은 고원이 모두 산지로 잡힐 수 있어 두 조건을 함께 사용했다.

### 고도 보완 자료

- 자료: **NOAA ETOPO 2022 60 arc-second Global Relief Model**
- 공식 안내·인용: <https://www.ncei.noaa.gov/products/etopo-global-relief-model>
- 제품 DOI: <https://doi.org/10.25921/fd45-gt74>
- 사용 격자: ERDDAP에서 0.5° 간격으로 추출한 표면 고도

## 3. GeoWeb 통합 방식

런타임에 100 MB급 GeoTIFF를 내려받거나 해석하지 않는다. 빌드 전 일회성 변환 스크립트로 아래를 수행한다.

1. `koppen_geiger_0p1.tif`의 값 1–30을 위 표의 5색으로 치환하고 값 0은 투명 처리한다.
2. K3 이진 래스터를 같은 EPSG:4326, 3600 × 1800 격자로 최근접 재표본화한다.
3. K3 산지이면서 ETOPO 표면 고도가 1,500 m 이상인 픽셀을 고산색으로 덧씌운다. 극위도는 한대로 유지한다.
4. 결과를 `public/data/geoweb-climate-1991-2020.png` 같은 로컬 indexed PNG로 저장한다.
5. `GlobeLab.jsx`에서는 토글이 켜질 때 PNG를 한 번 로드한 뒤 기존 4096 × 2048 오버레이 캔버스에 `drawImage`한다. 같은 등장방형 텍스처를 평면·Focus Lens·지구본이 공유하므로 별도 도법 코드는 필요 없다.

권장 배포 형식은 GeoJSON이 아니라 **indexed PNG**다. 원자료가 격자이고 경계가 매우 복잡하므로 벡터화하면 파일과 렌더링 비용이 커진다. PNG는 6색 + 투명 1색이라 압축 효율이 높고, 현재 Three.js 텍스처 경로에 바로 들어간다.

## 표현 방식 참고

### 근거가 되는 분류와 교육용 변환

Beck et al.의 원자료와 논문은 세계 기후를 **5개 대분류와 30개 세부형**으로 정의한다. 대분류는 A 열대, B 건조, C 온대, D 냉대(continental/cold), E 한대이고, 각 지도 셀은 그 위치의 월별 기온·강수량을 기준으로 분류된다. 따라서 GeoWeb의 열대·건조·온대·냉대·한대 5색은 임의의 위도 띠가 아니라 `legend.txt`의 1–30 값에서 A/B/C/D/E 첫 글자를 병합해 만들어야 한다.

- Beck et al. (2018)은 Köppen–Geiger가 5개 대분류·30개 세부형이며 월별 기온과 강수량의 임계값·계절성으로 분류된다고 설명한다: <https://www.nature.com/articles/sdata2018214>
- Peel et al. (2007)은 세부형을 3개 열대, 4개 건조, 9개 온대, 12개 냉대, 2개 한대로 명시한다: <https://hess.copernicus.org/articles/11/1633/2007/hess-11-1633-2007.pdf>
- 공식 배포 ZIP의 `legend.txt`도 값 1–30을 같은 A/B/C/D/E 순서와 이름으로 제공한다: <https://ndownloader.figshare.com/files/61012822>

사용자가 요구한 6번째 `고산`은 위 5분류에 그대로 존재하는 값이 아니다. 그러므로 **GeoWeb의 6분류는 공식 Köppen 5분류에 고산 학습용 레이어를 추가한 파생 표현**이라고 명시해야 한다. 과학 원자료 그대로라고 표현하면 안 된다.

### 지도에서 색을 칠하는 규칙

1. **기후색은 대륙색과 독립적이어야 한다.** 아프리카·아시아·남아메리카처럼 대륙이 달라도 같은 기후이면 완전히 같은 색을 사용한다. 대륙 소속은 기후 분류 입력값이 아니며, 각 셀의 기온·강수량으로 A–E가 정해진다.
2. **같은 색이 세계 여러 곳에 불연속적으로 반복되어야 한다.** 열대색은 아마존·콩고 분지·동남아시아에, 건조색은 사하라·아라비아·중앙아시아·호주 내륙 등에 떨어져 나타난다. 한 대륙을 한 색으로 채우는 것은 기후도가 아니라 대륙 구분도다.
3. **경계는 위도 직선이 아니라 원자료 격자의 불규칙한 경계를 따른다.** Beck et al.은 고해상도 지도가 기후가 이질적인 지역과 산지의 복잡성을 더 잘 표현한다고 설명한다. 따라서 위도 띠나 손으로 그린 대표 다각형은 사용하지 않는다.
4. 기후 토글을 켰을 때는 6개 범주색이 지면의 주제색이 되도록 충분히 불투명하게 표시한다. 기존 대륙색은 아래 배경으로만 남기고 기후색과 혼합해 대륙마다 다른 색처럼 보이게 하지 않는다.
5. 바다는 투명하게 유지하고, 국경선·대륙명·대양명은 기후색 위에서도 읽히도록 별도 상위 레이어에 둔다.
6. 범례의 6색과 지도 픽셀의 6색은 같은 상수를 공유한다. 원자료의 30색 팔레트를 그대로 쓰지 않고, 각 A/B/C/D/E 그룹을 사용자가 지정한 파스텔 대표색 하나로 치환한다.

Beck et al. (2018)의 Figure 1 역시 기후형별 색을 세계 전역에 동일하게 적용하며, 색 구성은 Peel et al.의 기후 분류 색 체계를 따랐다고 밝힌다. 이는 범주형 주제도에서 색이 대륙이 아니라 기후 클래스의 값이라는 직접적인 참고다: <https://www.nature.com/articles/sdata2018214#Fig1>

### 고산 표현의 한계와 정확한 문구

Peel et al. (2007)은 `H (Highland)`가 고도 정보를 따로 요구하며, 일정 고도 이상을 모두 H로 정하면 같은 장소를 A–E로 나타내는 것보다 기후 정보가 줄어든다는 이유로 H를 사용하지 않았다. 즉, 국제적으로 통일된 단일 고도 임계값을 공식 Köppen H 경계라고 간주할 수 없다: <https://hess.copernicus.org/articles/11/1633/2007/hess-11-1633-2007.pdf#page=6>

따라서 GeoWeb에서는 다음 원칙을 지킨다.

- `고산`은 Köppen 값의 번역이 아니라 USGS K3 산지 마스크를 NOAA ETOPO 표면 고도 1,500 m 이상으로 좁힌 **초등 학습용 보조 범주**다.
- 고산색을 가장 마지막에 덧씌우되 범례·정보 패널에 자료 결합 사실을 밝힌다.
- 1,500 m 기준은 공식 Köppen `H` 경계가 아니라 GeoWeb에서 산지 범위를 일관되게 좁히기 위한 교육용 운영 기준임을 밝힌다.
- 서비스 설명은 `정밀 기후 연구용 지도`가 아니라 `1991–2020 기후 자료를 초등 학습용 6개 범주로 재분류한 지도`로 쓴다.

권장 출처 문구:

> 기후 5종은 Beck et al. (2023) Köppen–Geiger 1991–2020 자료를 재분류했으며, 고산은 USGS Global Mountains K3와 NOAA ETOPO 2022를 결합한 초등 학습용 표현입니다.

### 표시·저작자 표기

범례 아래 또는 정보 패널에 다음을 넣는다.

> 자료: Beck et al. (2023) Köppen–Geiger 1991–2020, CC BY 4.0 · 고산 영역: USGS Global Mountains K3 + NOAA ETOPO 2022 · 초등 학습용 6개 범주로 재분류

## 4. 검증 체크

- 사하라·아라비아·중앙아시아·호주 내륙이 건조로 연결되는지
- 아마존·콩고·동남아시아가 열대이고, 사하라 이남 전체가 한 색으로 뭉치지 않는지
- 서유럽은 온대, 시베리아·캐나다 내륙은 냉대, 그린란드·남극은 한대인지
- 안데스·로키·히말라야·동아프리카 산지가 고산으로 나타나는지
- 바다 픽셀이 완전히 투명한지
- 경도 ±180° 이음매와 남북 방향이 뒤집히지 않았는지
- 평면·Focus Lens·지구본 세 보기에서 동일 위치에 같은 기후색이 나타나는지

## 출처

- GloH2O, Köppen–Geiger maps: <https://www.gloh2o.org/koppen/>
- Figshare dataset record: <https://figshare.com/articles/dataset/High-resolution_1_km_K_ppen-Geiger_maps_for_1901_2099_based_on_constrained_CMIP6_projections/21789074>
- Beck et al. (2023), Scientific Data: <https://doi.org/10.1038/s41597-023-02549-6>
- USGS Global Ecosystems — Global Mountains: <https://www.usgs.gov/centers/geosciences-and-environmental-change-science-center/science/global-ecosystems-global-data>
- USGS ScienceBase — Global Mountains K3: <https://www.sciencebase.gov/catalog/item/638fbf72d34ed907bf7d3080>
- NOAA NCEI — ETOPO 2022: <https://www.ncei.noaa.gov/products/etopo-global-relief-model>
