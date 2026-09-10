// Beck et al. (2023)의 Köppen–Geiger 대분류와 USGS/NOAA 산지 자료를
// 초등 사회 수업용 6개 범주로 합친 정적 텍스처의 표시 정보다.
export const CLIMATE_ZONE_ORDER = ['tropical', 'dry', 'temperate', 'cold', 'polar', 'highland'];

export const CLIMATE_ZONES = {
  tropical:  { ko: '열대', en: 'Tropical', color: '#F5A06F', fact: '일 년 내내 덥고 비가 많이 오는 곳이 많아요.' },
  dry:       { ko: '건조', en: 'Dry', color: '#F2D46B', fact: '비가 매우 적어 사막이나 초원이 나타나는 곳이에요.' },
  temperate: { ko: '온대', en: 'Temperate', color: '#8EC88B', fact: '계절의 변화가 비교적 뚜렷하고 생활하기 알맞아요.' },
  cold:      { ko: '냉대', en: 'Cold', color: '#9CA4D6', fact: '겨울이 길고 매우 추우며 침엽수림이 넓게 나타나요.' },
  polar:     { ko: '한대', en: 'Polar', color: '#E5EBF5', fact: '일 년 내내 매우 춥고 얼음이나 툰드라가 나타나요.' },
  highland:  { ko: '고산', en: 'Highland', color: '#69C4C7', fact: '높은 산지라 같은 위도의 낮은 곳보다 기온이 낮아요.' },
};

// 기후 토글을 처음 켰을 때는 여섯 기후대가 모두 보이고, 범례에서 각각 끌 수 있다.
export const ALL_CLIMATE_SELECTION = Object.freeze(Object.fromEntries(
  CLIMATE_ZONE_ORDER.map((key) => [key, true]),
));

export const CLIMATE_TEXTURE_URL = '/lab-data/geoweb-climate-1991-2020.png';
