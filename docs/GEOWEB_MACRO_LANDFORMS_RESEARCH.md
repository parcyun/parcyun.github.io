# GeoWeb 세계 지형: 수업용 광역 권역 표현 조사

조사일: 2026-09-10
적용 전 상태: Natural Earth 50m `geography_regions_polys`의 대표 다각형을 개별 지형으로 표시

## 결론

초등 수업용 지도에서는 세부 지형을 모두 따로 칠하기보다, 널리 쓰이는 **큰 지형권역 이름 하나**를 먼저 보이게 하는 편이 낫다. 다만 지형의 엄밀한 경계는 학술·행정 경계가 아니므로, GeoWeb에는 `대표 수업용 범위`라는 설명을 유지해야 한다.

Natural Earth는 주요 물리 지형의 면·점 라벨을 제공하며, 면 다각형은 Patterson의 세계 물리 지도와 국제 자원봉사자 편집에 바탕을 둔다. 원자료도 물리 지형 경계를 대략적인 것으로 보라고 명시한다. 따라서 이 기능은 정밀 GIS 경계가 아니라 세계지리 학습용 개괄 지도에 적합하다.[^ne-10m][^ne-50m]

## 기준 자료와 표현 원칙

1. **원자료:** Natural Earth 10m/50m `geography_regions_polys`의 `NAME`, `FEATURECLA` 다각형. 10m은 원본 편집본이고 50m은 그것을 축척별로 추린 버전이므로, 선별 기준은 10m 이름표를 기준으로 정하고 실제 웹 경량화에는 50m을 사용한다.[^ne-50m]
2. **광역권역:** 여러 세부 사막·산지를 한 이름으로 가르칠 때는 그 하위 다각형을 나란히 덧칠하지 않고, 가장 상위의 대표 다각형 하나를 우선 쓴다.
3. **화면 일반화:** 로키처럼 폭이 얇아 세계지도에서 선처럼 보이는 산맥은 원자료 지형을 다른 산맥으로 바꾸지 않는다. 원본 다각형 바깥으로 지도상 약 0.7–1.0도(세계 전체 보기에서 약 4–7px)에 해당하는 표시용 완충을 적용하되, 확대할수록 원본 경계에 가까워지게 한다. 이는 실제 범위 확대가 아니라 읽기 쉬운 지도 일반화다.
4. **라벨:** 광역권역 라벨을 하나만 표시한다. 하위 사막·세부 산맥은 같은 토글에서 중복 라벨을 내지 않는다.

## 핵심 수정 권고

| 수업용 표시 이름 | 권고 원자료 선택 | 범위·명칭 근거 | 구현 권고 |
| --- | --- | --- | --- |
| **아라비아 사막** | `ARABIAN PENINSULA`를 광역 표시용으로 사용. `RUB’ AL KHALI`, `SYRIAN DESERT`, `AN NAFUD DESERT`, `WAHIBA SANDS`는 이 광역 라벨의 하위 참고 자료로만 유지 | Natural Earth에는 `ARABIAN DESERT` 단일 면이 없고, `ARABIAN PENINSULA`는 반도 전체(약 34.6–59.8°E, 12.6–31.1°N)를 제공한다. 아라비아 사막은 통상 아라비아반도 대부분을 차지하는 광역 건조권으로 설명되므로, 사용자가 요청한 초등 수준의 크게 묶는 표시에 가장 맞는다.[^ne-50m][^arabian] | 지형 분류는 원래 `Pen/cape`이지만, **수업용 지형 레이어에서만** 사막 색으로 분류한다. 개별 룹알할리·시리아사막은 같은 화면에서 겹쳐 칠하지 않는다. |
| **고비 사막** | `GOBI DESERT` 단독 | 원자료의 고비 면 자체가 약 94.5–117.7°E, 37.8–47.8°N로 몽골 남부와 중국 북부에 걸친 광역 범위다. 타클라마칸·무우스 사막은 별개의 사막이므로 고비에 합치지 않는다.[^ne-50m] | 현재보다 좁아 보이면 다른 사막을 합치지 말고, 사막 다각형에만 표시용 0.4–0.6도 완충을 적용한다. 라벨은 `고비 사막` 하나만 둔다. |
| **그레이트플레인스** | `GREAT PLAINS` 단독 | 사용자의 지적이 맞다. 고유 지명은 **Great Plains(그레이트플레인스)** 이며, `미국 대평원`은 캐나다 남부까지 이어지는 범위를 미국으로만 좁혀 부르는 표현이다. Natural Earth도 `GREAT PLAINS`를 평원으로 분류한다.[^ne-50m] | 지도 라벨은 `그레이트플레인스`로, 보조 설명은 `북아메리카의 넓은 대평원`으로 쓴다. 원자료 범위(약 28.2–54.1°N)는 캐나다~미국 남중부를 포함하므로 별도 확장은 필요 없다. NPS·USGS도 로키 동쪽의 대평원을 별도 지형권으로 설명한다.[^nps-great-plains][^usgs-great-plains] |
| **로키산맥** | `ROCKY MOUNTAINS` 단독 | 원자료의 대표 산맥 면은 약 35.3–59.7°N, 127.2–104.1°W로 캐나다~미국 중부 뉴멕시코의 긴 범위를 포괄한다. NPS도 로키산맥을 캐나다에서 뉴멕시코 중부까지 이어지는 산계로 설명한다.[^ne-50m][^nps-rockies] | `CASCADE RANGE`, `SIERRA NEVADA`, `MACKENZIE MTS.`를 로키로 합치지 않는다. 현재 너무 좁게 보이는 문제는 다른 산맥을 합치는 대신 위 화면 일반화 완충으로 해결한다. |

## 함께 정리할 대표 권역

### 사막

| 수업용 이름 | 권고 원자료 | 비고 |
| --- | --- | --- |
| 사하라 사막 | `SAHARA` 단독 | `LIBYAN DESERT`, `NUBIAN DESERT`를 동시에 칠하지 않는다. 사하라라는 큰 이름 하나로 표시한다. |
| 아라비아 사막 | `ARABIAN PENINSULA` | 위 핵심 권고. 원자료 분류와 수업용 분류가 다름을 데이터 메모에 남긴다. |
| 고비 사막 | `GOBI DESERT` | 타클라마칸과 분리. |
| 중앙아시아 사막 | `QIZILQUM DESERT`, `GARAGUM DESERT` | 둘은 합쳐 `중앙아시아 사막권`으로 보일 수 있으나, 초등 기본 항목에서는 선택 사항이다. |
| 오스트레일리아 사막권 | `GREAT SANDY DESERT`, `GIBSON DESERT`, `GREAT VICTORIA DESERT`, `SIMPSON DESERT`, `TANAMI DESERT`, `STRZELECKI DESERT` | 현재의 두 사막만으로는 호주 내륙 전체가 지나치게 조각나 보인다. 광역 라벨을 쓸 경우 `오스트레일리아 사막권`으로 묶고, 각각의 고유 사막명을 동시에 표시하지 않는다. |

### 산맥

각 행의 첫 원자료 면은 이미 세계지도용 광역 대표 다각형이다. 따라서 산맥을 넓게 보이게 하려면 인접한 독립 산맥을 잘못 합치지 말고, 대표 면의 표시 완충과 라벨 우선순위를 적용한다.

| 수업용 이름 | 대표 원자료 | 합치지 말아야 할 인접 지형 |
| --- | --- | --- |
| 로키산맥 | `ROCKY MOUNTAINS` | `CASCADE RANGE`, `SIERRA NEVADA`, `MACKENZIE MTS.` |
| 안데스산맥 | `ANDES` | 개별 `CORDILLERA`들 |
| 히말라야산맥 | `HIMALAYAS` | `KARAKORAM RA.`, `HINDU KUSH`, `KUNLUN MOUNTAINS` |
| 아틀라스산맥 | `ATLAS MOUNTAINS` | `HAUT ATLAS`, `ATLAS SAHARIEN`은 중복 세부 범위 |
| 애팔래치아산맥 | `APPALACHIAN MTS.` | `BLUE RIDGE` 등 세부 산지 |
| 그레이트디바이딩산맥 | `GREAT DIVIDING RANGE` | `AUSTRALIAN ALPS`, `BLUE MTS.` |

### 고원·평원

| 수업용 이름 | 권고 원자료 | 범위 표시 원칙 |
| --- | --- | --- |
| 티베트고원 | `PLATEAU OF TIBET` | 동·서부 고원을 별도로 합치지 않는다. |
| 데칸고원 | `DECCAN PLATEAU` | 인도 반도 내부의 대표 면을 사용한다. |
| 브라질고원 | `BRAZILIAN HIGHLANDS`, `PLANALTO CENTRAL`, `PLANALTO DO MATO GROSSO` | 초등용 광역 라벨 하나로 표시하되, 세 면을 **브라질고원권**으로 병합해 지나치게 잘린 인상을 줄인다. |
| 중앙시베리아고원 | `CENTRAL SIBERIAN PLATEAU`, `PUTORANA PLATEAU`, `ALDAN UPLAND` | `시베리아` 전체는 지형 단위가 아니라 지역명이다. 라벨은 중앙시베리아고원으로 제한한다. |
| 북유럽평원 | `NORTHERN EUROPEAN PLAIN` | 프랑스 북부·독일·폴란드·우크라이나로 이어지는 큰 평원이라는 설명을 붙인다. |
| 그레이트플레인스 | `GREAT PLAINS` | 캐나다~미국 남중부까지의 큰 대평원. |
| 중앙아시아 평원·저지 | `TURAN LOWLAND`, `KAZAKH STEPPE` | 별도 수업 주제일 때만 추가한다. |
| 남아메리카 평원권 | `PAMPAS`, `LLANOS`, `GRAN CHACO`, `CHACO BOREAL`, `CHACO AUSTRAL` | 팜파스·야노스·그란차코는 각각 이름을 유지하되, 그란차코는 두 세부 면을 함께 선택한다. |

## 데이터 선택 목록 제안

아래 목록은 코드에 들어갈 **광역 표시용 묶음**이다. 괄호 안은 Natural Earth의 정확한 `NAME` 값이다.

```text
사막
- 사하라 사막: SAHARA
- 아라비아 사막: ARABIAN PENINSULA
- 고비 사막: GOBI DESERT
- 오스트레일리아 사막권: GREAT SANDY DESERT, GIBSON DESERT,
  GREAT VICTORIA DESERT, SIMPSON DESERT, TANAMI DESERT, STRZELECKI DESERT

산맥
- 로키산맥: ROCKY MOUNTAINS
- 안데스산맥: ANDES
- 히말라야산맥: HIMALAYAS
- 아틀라스산맥: ATLAS MOUNTAINS
- 애팔래치아산맥: APPALACHIAN MTS.
- 그레이트디바이딩산맥: GREAT DIVIDING RANGE

고원·평원
- 브라질고원권: BRAZILIAN HIGHLANDS, PLANALTO CENTRAL, PLANALTO DO MATO GROSSO
- 그레이트플레인스: GREAT PLAINS
- 그란차코: GRAN CHACO, CHACO BOREAL, CHACO AUSTRAL
```

## 반영 시 확인 항목

- `ARABIAN PENINSULA`는 원자료상 반도이지 사막이므로, 파일 속성에 `teachingGroup: 'Arabian Desert'`와 `sourceFeatureClass: 'Pen/cape'`를 함께 보존한다.
- 광역권역에 포함된 하위 지형은 중복 오버레이와 중복 이름을 제거한다.
- 강은 기존 원칙대로 면 완충 없이 흐름선만 표시한다.
- 지형은 수업용 대표 권역이며, 정밀 경계·토지피복 지도가 아니라는 범례 설명을 유지한다.

## 출처

[^ne-10m]: [Natural Earth, 1:10m Physical Labels](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/) — 주요 물리 지형의 면·점 라벨, 원자료 유래 및 경계 한계 설명.
[^ne-50m]: [Natural Earth, 1:50m Physical Labels](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-physical-labels/) — `SAHARA`, `GOBI DESERT`, `GREAT PLAINS`, `ROCKY MOUNTAINS` 등 기능 목록과 50m 축척 주의 사항.
[^arabian]: [Encyclopaedia Britannica, Arabian Desert](https://www.britannica.com/place/Arabian-Desert) — 아라비아반도 대부분을 차지하는 광역 사막권 설명. (명칭·개괄 범위 교차 확인용 2차 참고 자료)
[^nps-great-plains]: [U.S. National Park Service, Great Plains Province](https://www.nps.gov/articles/greatplainsprovince.htm) — 그레이트플레인스와 로키산맥의 서쪽 경계 관계.
[^usgs-great-plains]: [U.S. Geological Survey, Great Plains Region](https://pubs.usgs.gov/circ/1951/0114/report.pdf) — 로키 동쪽에서 남북으로 이어지는 Great Plains의 개괄 범위.
[^nps-rockies]: [U.S. National Park Service, Rocky Mountain System Provinces](https://www.nps.gov/articles/rockies.htm) — 캐나다에서 뉴멕시코 중부까지 이어지는 로키산맥 설명.

## 최종 반영 집합: Natural Earth 50m 실제 존재 이름

아래 목록은 2026-09-10에 `ne_50m_geography_regions_polys`의 `NAME` 값과 직접 대조했다. 기본 집합은 50m를 사용한다. 다만 사용자 요청처럼 호주 사막권을 조각나지 않게 보여 주기 위해, 50m에 없는 세부 사막 네 곳은 원본 편집본인 10m에서 선별해 경량화한다.

| 화면의 광역 이름 | 50m에 실제 있는 `NAME` | 적용 방식 |
| --- | --- | --- |
| 사하라 사막 | `SAHARA` | 리비아·누비아 사막을 중복으로 덧칠하지 않는 단일 광역 면 |
| 아라비아 사막 | `ARABIAN PENINSULA` | 원자료 분류는 `Pen/cape`; 수업용 사막권 프록시라는 메타를 보존 |
| 고비 사막 | `GOBI DESERT` | 타클라마칸과 합치지 않는 단일 광역 면 |
| 중앙아시아 사막권 | `QIZILQUM DESERT`, `GARAGUM DESERT` | 두 실제 사막 면을 같은 광역 라벨 아래 묶되, 필요 시 각각 라벨은 숨김 |
| 오스트레일리아 사막권 | 50m `GREAT SANDY DESERT`, `GREAT VICTORIA DESERT` + 10m `GIBSON DESERT`, `SIMPSON DESERT`, `TANAMI DESERT`, `STRZELECKI DESERT` | 50m 누락 지역은 10m 원본 편집본에서 선별해 하나의 수업용 광역권으로 묶음 |
| 브라질고원권 | `BRAZILIAN HIGHLANDS`, `PLANALTO CENTRAL`, `PLANALTO DO MATO GROSSO` | 세 다각형을 같은 색·하나의 ‘브라질고원’ 라벨로 묶음 |
| 그란차코 | `GRAN CHACO`, `CHACO BOREAL`, `CHACO AUSTRAL` | 세 다각형을 같은 색·하나의 ‘그란차코’ 라벨로 묶음 |
| 중앙아시아 평원·저지 | `TURAN LOWLAND`, `KAZAKH STEPPE` | ‘중앙아시아 평원·저지’라는 수업용 넓은 이름 아래 병합 |
| 그레이트플레인스 | `GREAT PLAINS` | 캐나다~미국을 포괄하는 단일 평원 면, 라벨은 ‘그레이트플레인스’ |
| 북유럽평원 | `NORTHERN EUROPEAN PLAIN` | 프랑스 북부~우크라이나를 포괄하는 대표 평원 면 |
| 로키산맥 | `ROCKY MOUNTAINS` | 독립 산맥을 병합하지 않고 표시용 완충만 적용 |
| 아틀라스산맥 | `ATLAS MOUNTAINS` | `HAUT ATLAS`, `ATLAS SAHARIEN`과 중복으로 덧칠하지 않는 대표 면 |
| 안데스산맥 | `ANDES` | 세부 코르디예라를 병합하지 않는 대표 면 |

### 50m 한계와 다음 선택

- 50m에는 호주 내륙의 모든 세부 사막이 남아 있지 않다. 따라서 10m 자료에서 `GIBSON DESERT`, `SIMPSON DESERT`, `TANAMI DESERT`, `STRZELECKI DESERT`를 별도로 추출·경량화해 반영했다. 각 데이터 항목의 `sourceScale` 속성으로 50m·10m 출처를 구분한다.
- 아라비아반도 전체를 사막으로 보는 표현은 지형학적 정밀 경계가 아니라, 사용자가 요청한 초등 수업용 ‘큰 지형권역’ 일반화다. 실제 원자료의 `FEATURECLA`와 이 수업용 분류를 모두 데이터에 남긴다.
