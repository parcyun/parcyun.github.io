// 지구본 lab 전체 UI 문자열 — 한국어(ko)/영어(en). 서비스 언어 토글 시 화면 전체가 바뀜.
// 사용: const T=STR[lang]; T.gridTitle 등. 대륙/대양/국가명은 globeCountryData.js + CONT/OCEAN에서 별도 처리.
export const STR = {
  ko: {
    title:'세계 지도', subtitle:'6대륙 5대양', kicker:'World Map · Interactive · v1.1.0',
    gridTitle:'격자', grat:'위경도 격자', equator:'적도', prime:'본초자오선', dateline:'날짜변경선',
    interval:'간격', pickCountry:'국가 선택', trueSize:'실제 크기 비교', flatOnly:'평면 전용',
    sat:'위성 사진', dayNight:'낮과 밤', langLabel:'언어', earth:'구글 어스 바로가기',
    share:'쌤 동료에게 공유하기', shareCopied:'링크가 복사되었습니다 · 동료에게 붙여넣어 공유하세요',
    flat:'평면', lens:'Focus Lens', globe:'지구본',
    zoomIn:'확대', zoomOut:'축소', home:'처음으로', northUp:'정북 고정',
    contHead:'6 Continents', oceanHead:'5 Oceans', antarcticaNote:'남극(Antarctica)은 6대륙에서 제외',
    countrySearch:'국가명 검색', countrySearchPlaceholder:'국가·수도·국가 코드 검색', searching:'찾는 중…',
    noCountryResults:'일치하는 국가가 없어요.', capitalLabel:'수도', populationLabel:'인구', approximate:'약',
    politicalLabel:'정치체제', economicLabel:'경제체제',
    // 가이드
    gTools:'← 지도 도구: 격자·위성사진·낮과 밤·실제 크기 비교',
    gProj:'위 버튼으로 평면·렌즈·지구본 도법을 전환해요 ↑',
    gLegend:'대륙·대양·국가를 클릭하면 정보 카드가 떠요 →',
    gCtrl:'확대 · 축소 · 정북 고정 · 처음으로 →',
    gCenter:'지도를 드래그·클릭하며 탐색해 보세요', gCenterSub:'아무 곳이나 누르면 닫혀요',
    // 힌트
    hintFlat:'드래그하면 지도가 좌우로 끝없이 이어집니다 · 대륙을 클릭해 보세요',
    hintLens:'드래그로 렌즈 회전 · 대륙을 클릭해 보세요',
    hintGlobe:'드래그로 회전 · 휠로 확대 · 대륙을 클릭해 보세요',
    // 실제 크기 비교 팝업
    tsTitle:'실제 크기 비교',
    tsP1:'메르카토르 도법은 위도가 높을수록 나라를 실제보다 크게 부풀립니다(그린란드가 아프리카만큼 커 보이는 이유예요).',
    tsP2pre:'사용법', tsP2:' — 국가(또는 대륙)를 클릭한 뒤 드래그해 다른 위도로 옮겨보세요. 실제(지상) 크기를 유지하도록 자동으로 크기가 재조정됩니다.',
    close:'닫기',
    // 푸터/커피
    coffee:'커피 사주기', dashboard:'업무 대시보드', designedBy:'Designed by',
    coffeeTitle:'개발자에게 커피 한 잔', coffeeSub:'QR을 스캔해 후원할 수 있어요. 감사합니다!',
    // 낮과 밤
    janEnd:'1월', decEnd:'12월',
    // 워터마크
    wmFlat:'MERCATOR PROJECTION', wmLens:'FOCUS LENS VIEW', wmGlobe:'ORTHOGRAPHIC GLOBE',
    // 상태
    stLoadGeo:'지형 데이터 로딩…', stBuild:'지형 구성…',
    // 정보 카드 라벨
    langsLabel:'언어', unknownCountry:'대륙의 나라예요.',
  },
  en: {
    title:'World Map', subtitle:'6 Continents · 5 Oceans', kicker:'World Map · Interactive · v1.1.0',
    gridTitle:'Grid', grat:'Graticule', equator:'Equator', prime:'Prime Meridian', dateline:'Date Line',
    interval:'Interval', pickCountry:'Select country', trueSize:'True size', flatOnly:'Flat only',
    sat:'Satellite', dayNight:'Day & Night', langLabel:'Language', earth:'Open Google Earth',
    share:'Share with colleagues', shareCopied:'Link copied · paste it to share with colleagues',
    flat:'Flat', lens:'Focus Lens', globe:'Globe',
    zoomIn:'Zoom in', zoomOut:'Zoom out', home:'Reset', northUp:'North up',
    contHead:'6 Continents', oceanHead:'5 Oceans', antarcticaNote:'Antarctica is excluded from the 6 continents',
    countrySearch:'Search countries', countrySearchPlaceholder:'Country, capital, or code', searching:'Searching…',
    noCountryResults:'No matching country.', capitalLabel:'Capital', populationLabel:'Population', approximate:'Approx.',
    politicalLabel:'Political system', economicLabel:'Economic system',
    gTools:'← Map tools: grid · satellite · day/night · true size',
    gProj:'Switch Flat · Lens · Globe projections above ↑',
    gLegend:'Click a continent, ocean, or country for an info card →',
    gCtrl:'Zoom in · out · north-up · reset →',
    gCenter:'Drag and click the map to explore', gCenterSub:'Tap anywhere to close',
    hintFlat:'Drag to scroll the map endlessly · click a continent',
    hintLens:'Drag to rotate the lens · click a continent',
    hintGlobe:'Drag to rotate · wheel to zoom · click a continent',
    tsTitle:'True size comparison',
    tsP1:'The Mercator projection inflates countries the farther they are from the equator (that\'s why Greenland looks as big as Africa).',
    tsP2pre:'How to', tsP2:' — click a country (or continent) then drag it to another latitude. It automatically rescales to keep its real (ground) size.',
    close:'Close',
    coffee:'Buy a coffee', dashboard:'Work dashboard', designedBy:'Designed by',
    coffeeTitle:'Buy the developer a coffee', coffeeSub:'Scan the QR to support. Thank you!',
    janEnd:'Jan', decEnd:'Dec',
    wmFlat:'MERCATOR PROJECTION', wmLens:'FOCUS LENS VIEW', wmGlobe:'ORTHOGRAPHIC GLOBE',
    stLoadGeo:'Loading terrain…', stBuild:'Building terrain…',
    langsLabel:'Languages', unknownCountry:'A country in this continent.',
  },
};
export const MONTHS_I18N = {
  ko:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
};
