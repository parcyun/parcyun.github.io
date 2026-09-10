// 초등 사회 수업용 단순 기후대. 실제 기후 경계는 지형·바람·해류에 따라 더 복잡하다.
export const CLIMATE_ZONE_ORDER = ['tropical', 'temperate', 'cold', 'polar', 'dry', 'highland'];

export const CLIMATE_ZONES = {
  tropical:  { ko: '열대', en: 'Tropical', color: '#9EDDB9', fact: '일 년 내내 덥고 비가 많이 오는 곳이 많아요.' },
  temperate: { ko: '온대', en: 'Temperate', color: '#F7D99A', fact: '계절의 변화가 비교적 뚜렷하고 생활하기 알맞아요.' },
  cold:      { ko: '냉대', en: 'Cold', color: '#AFCDEA', fact: '겨울이 길고 매우 추우며 침엽수림이 넓게 나타나요.' },
  polar:     { ko: '한대', en: 'Polar', color: '#DDE5F2', fact: '일 년 내내 매우 춥고 얼음이나 툰드라가 나타나요.' },
  dry:       { ko: '건조', en: 'Dry', color: '#EBC7A2', fact: '비가 매우 적어 사막이나 초원이 나타나는 곳이에요.' },
  highland:  { ko: '고산', en: 'Highland', color: '#CFB8DF', fact: '높은 산지라 같은 위도의 낮은 곳보다 기온이 낮아요.' },
};

// 먼저 전 세계 육지를 위도에 따라 채운 뒤, 건조·고산 지역을 위에 덧칠한다.
export const CLIMATE_BANDS = [
  { zone: 'polar', minLat: 66.5, maxLat: 90 },
  { zone: 'cold', minLat: 50, maxLat: 66.5 },
  { zone: 'temperate', minLat: 23.5, maxLat: 50 },
  { zone: 'tropical', minLat: -23.5, maxLat: 23.5 },
  { zone: 'temperate', minLat: -60, maxLat: -23.5 },
  { zone: 'polar', minLat: -90, maxLat: -60 },
];

// 교실에서 대략적인 위치를 찾기 위한 대표 지역 경계(정밀 기후 자료가 아님).
export const CLIMATE_REGIONS = [
  // 건조 기후
  { zone: 'dry', points: [[-17, 15], [10, 13], [35, 16], [51, 25], [42, 36], [15, 37], [-10, 31], [-17, 15]] },
  { zone: 'dry', points: [[35, 14], [53, 12], [64, 24], [58, 34], [43, 36], [35, 14]] },
  { zone: 'dry', points: [[55, 35], [72, 25], [105, 36], [112, 47], [82, 50], [55, 35]] },
  { zone: 'dry', points: [[-124, 22], [-103, 18], [-98, 34], [-112, 43], [-124, 35], [-124, 22]] },
  { zone: 'dry', points: [[-81, -4], [-68, -18], [-69, -31], [-75, -27], [-81, -4]] },
  { zone: 'dry', points: [[11, -18], [31, -18], [30, -31], [17, -34], [11, -18]] },
  { zone: 'dry', points: [[112, -18], [138, -12], [153, -25], [145, -38], [118, -35], [112, -18]] },
  // 고산 기후
  { zone: 'highland', points: [[-79, 10], [-72, 5], [-68, -18], [-65, -32], [-69, -55], [-75, -45], [-74, -20], [-79, 10]] },
  { zone: 'highland', points: [[-128, 58], [-113, 60], [-104, 43], [-106, 27], [-114, 30], [-119, 45], [-128, 58]] },
  { zone: 'highland', points: [[66, 31], [80, 26], [102, 29], [103, 38], [91, 40], [75, 37], [66, 31]] },
  { zone: 'highland', points: [[34, 13], [43, 5], [39, -6], [29, -4], [34, 13]] },
  { zone: 'highland', points: [[5, 43], [18, 43], [17, 48], [7, 48], [5, 43]] },
  { zone: 'highland', points: [[137, -2], [150, -3], [149, -10], [137, -9], [137, -2]] },
];
