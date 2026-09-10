# GeoWeb 세계의 지형 레이어 자료

## 원자료

- [Natural Earth 50m Physical Vectors](https://www.naturalearthdata.com/downloads/50m-physical-vectors/)
- [Natural Earth 50m Rivers, Lake Centerlines](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-rivers-lake-centerlines/)
- [Natural Earth 50m Physical Labels](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-physical-labels/)

Natural Earth의 50m 물리 벡터(공개 도메인)에서 교육용 대표 항목을 선별했다. 50m에 빠진 오스트레일리아 내륙 사막은 같은 원자료의 10m 편집본에서 보완했으며 각 항목의 `sourceScale` 속성으로 출처 축척을 구분한다. 강은 원자료의 흐름선만 그리며, 산맥·고원·평원·사막은 상세 경계도가 아닌 수업용 대표 영역이다.

## 수업용 선택 항목

- 주요 강: 나일, 인더스, 갠지스, 메콩, 황허, 양쯔강, 미시시피, 아마존, 콩고, 다뉴브, 볼가, 오비, 예니세이, 레나
- 산맥: 알프스, 히말라야, 우랄, 캅카스, 아틀라스, 로키, 애팔래치아, 안데스, 그레이트디바이딩산맥
- 고원: 에티오피아고원(아비시니아고원), 데칸고원, 티베트고원, 브라질고원권, 중앙시베리아고원, 몽골고원, 콜로라도고원, 알티플라노고원
- 평원: 북유럽평원(프랑스·우크라이나 지역 포함), 화베이평원(중원), 그레이트플레인스, 서시베리아평원, 갠지스평원, 만주평원, 팜파스, 야노스, 그란차코
- 사막: 사하라, 고비, 아라비아 사막(아라비아반도 수업용 대표 범위), 타르, 타클라마칸, 칼라하리, 나미브, 아타카마, 파타고니아 사막(파타고니아 수업용 대표 범위), 오스트레일리아 사막권

## 명칭과 범위

- 입력의 ‘애틀랜타 산맥’은 세계 주요 산맥 목록과 대조해 애팔래치아산맥으로 보정했다.
- ‘시베리아’는 지형 종류가 모호하므로 중앙시베리아고원과 서시베리아평원으로 나누어 표시했다.
- 지도는 초등 수업에서 큰 분포를 비교하기 위한 도구이며, 국가·지질 경계를 정밀하게 나타내는 자료가 아니다.
- 파타고니아 사막은 Natural Earth의 `PATAGONIA` `geoarea` 다각형을 수업용 건조 지형 범위로 사용한다. 원자료 분류는 데이터의 `sourceClass`에 보존해, 정밀 사막 경계로 오해하지 않도록 한다.
