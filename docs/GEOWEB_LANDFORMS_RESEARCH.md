# GeoWeb 세계의 지형 범위 보정 조사

조사일: 2026-09-10
목적: 초등 사회에서 쓰는 대표 지형을 지나치게 작은 조각으로 보이지 않도록, 같은 기준의 **Natural Earth 1:50m Physical Labels** 다각형으로 보정한다.

## 기준 자료와 한계

- [Natural Earth 1:50m Physical Labels](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-physical-labels/)의 area features를 사용한다. 이 자료는 주요 자연지형의 면·점 라벨 자료이며, Patterson 세계 자연지도로부터 주로 유래했다.
- 해당 자료는 영역 경계가 1:50m 지도 축척에서 대략적으로 맞는다고 명시한다. 따라서 GeoWeb에서는 국경이나 정확한 지질 경계가 아니라 **수업용 대표 범위**임을 유지한다.
- 범위는 별도 손그림 확장 대신, 서로 이어지는 원자료 다각형을 함께 선택해 넓힌다. 이렇게 하면 재생성 가능하고 출처도 명확하다.

## 권장 보정

### 고원

현재의 티베트·에티오피아(아비시니아)·데칸·브라질·중앙시베리아 고원은 유지한다. 세계 분포를 균형 있게 보여 주려면 다음 세 지역을 추가한다.

| 표시 이름 | Natural Earth 원자료 `NAME` | 적용 이유 |
| --- | --- | --- |
| 몽골고원 | `MONGOLIAN PLATEAU` | 티베트고원 북쪽의 넓은 고원 지대를 함께 비교할 수 있다. |
| 콜로라도고원 | `COLORADO PLATEAU` | 북아메리카의 대표 고원으로, 대륙별 비교에 필요하다. |
| 알티플라노고원 | `ALTIPLANO` | 안데스 동쪽의 고원 지대를 나타내어 남아메리카 범위를 보완한다. |

`ETHIOPIAN HIGHLANDS`는 원자료의 한국어 이름도 “에티오피아고원”이며, 수업에서 쓰는 아비시니아고원과 같은 지형을 가리킨다. 브라질은 `BRAZILIAN HIGHLANDS`를 우선 사용한다. `PLANALTO CENTRAL`까지 동시에 넣으면 동일한 브라질 고원권이 이중 강조될 수 있으므로, 별도 세부 항목으로 표시하지 않는 한 추가하지 않는다.

### 평원

프랑스와 우크라이나는 독립된 두 평원이 아니라 유럽의 넓은 저지·평원대 맥락에서 다룬다. `NORTHERN EUROPEAN PLAIN`을 유지하되, 아래의 대표 평원을 추가해 세계 비교 범위를 넓힌다.

| 표시 이름 | Natural Earth 원자료 `NAME` | 적용 이유 |
| --- | --- | --- |
| 만주 평원 | `MANCHURIAN PLAIN` | 중국 동북부의 넓은 평원으로 화베이 평원과 구분된다. |
| 판노니아 평원권 | `PANNONIAN BASIN` 없음 | 원자료에 해당 단일 평원 다각형이 없어 이번 범위 보정에서 제외한다. |
| 팜파스 | `PAMPAS` | 남아메리카의 대표 평원으로 대륙별 비교를 보완한다. |
| 야노스 | `LLANOS` | 남아메리카 북부의 대평원을 보완한다. |
| 그란차코 | `GRAN CHACO` | 남아메리카 내륙의 넓은 평원·저지 성격 지역을 보완한다. |

`GREAT PLAINS`, `NORTH CHINA PLAIN`, `GANGES PLAIN`, `WESTERN SIBERIAN PLAIN`은 유지한다. 필요하면 `TURAN LOWLAND`와 `KAZAKH STEPPE`는 “평원·저지”라는 수업용 넓은 분류에서 추가할 수 있으나, 초등 화면의 항목 수를 우선해 2차 확장 후보로 둔다.

### 사막

현재 사하라·고비·칼라하리·나미브·아타카마·그레이트샌디·그레이트빅토리아는 유지하고, 큰 사막권을 더 온전하게 보이도록 아래 다각형을 추가한다.

| 표시 이름 | Natural Earth 원자료 `NAME` | 범위 보정 |
| --- | --- | --- |
| 사하라 동부 | `LIBYAN DESERT`, `NUBIAN DESERT` | 사하라 주 다각형의 동쪽 세부 건조권을 보완한다. |
| 아라비아 사막권 | `RUB’ AL KHALI`, `SYRIAN DESERT` | 원자료에는 `ARABIAN DESERT` 단일 다각형이 없으므로, 두 대표 사막으로 표시한다. |
| 타르 사막 | `THAR DESERT` | 인도·파키스탄 경계의 대표 사막을 추가한다. |
| 타클라마칸 사막 | `TAKLIMAKAN DESERT` | 중앙아시아·중국 내륙의 대표 사막을 추가한다. |

`PATAGONIAN DESERT`는 원자료에 단일 사막 다각형이 없다. 다만 수업에서 파타고니아의 건조 지형을 함께 비교할 수 있도록, 사용자의 요청에 따라 Natural Earth의 `PATAGONIA` `geoarea` 다각형을 **파타고니아 사막 수업용 대표 범위**로 표시한다. 이는 정확한 사막 경계가 아닌 축척화된 학습 범위이며, 데이터의 `sourceClass: Geoarea`로 원래 분류를 보존한다. 아타카마 사막(`DESIERTO DE ATACAMA`)도 별도 대표 건조 지형으로 유지한다.

## 구현에 쓸 정확한 선택 집합

```js
plateaus: [
  'ETHIOPIAN HIGHLANDS', 'DECCAN PLATEAU', 'PLATEAU OF TIBET',
  'BRAZILIAN HIGHLANDS', 'CENTRAL SIBERIAN PLATEAU', 'MONGOLIAN PLATEAU',
  'COLORADO PLATEAU', 'ALTIPLANO',
],
plains: [
  'NORTHERN EUROPEAN PLAIN', 'NORTH CHINA PLAIN', 'GREAT PLAINS',
  'WESTERN SIBERIAN PLAIN', 'GANGES PLAIN', 'MANCHURIAN PLAIN',
  'PAMPAS', 'LLANOS', 'GRAN CHACO',
],
deserts: [
  'SAHARA', 'LIBYAN DESERT', 'NUBIAN DESERT', 'GOBI DESERT',
  'RUB’ AL KHALI', 'SYRIAN DESERT', 'THAR DESERT', 'TAKLIMAKAN DESERT',
  'KALAHARI DESERT', 'NAMIB DESERT', 'DESIERTO DE ATACAMA',
  'GREAT SANDY DESERT', 'GREAT VICTORIA DESERT',
],
```

이 목록은 원자료의 feature list에서 각각 `plateau`, `plain`/`lowland`, `desert`로 분류된 항목만 사용한다. 강은 별도 Natural Earth [Rivers, Lake Centerlines](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-rivers-lake-centerlines/)의 선형 자료만 사용한다.
