// Natural Earth physical vectors에서 초등 사회 수업용 대표 지형만 골라낸 표시 규칙이다.
// 색은 범주 구분용이며, 지도에서는 모두 70% 불투명도로 겹쳐 그린다.
export const LANDFORM_DATA_URL = '/lab-data/geoweb-landforms.json';

export const LANDFORM_CATEGORY_ORDER = ['rivers', 'mountains', 'plateaus', 'plains', 'deserts'];

export const LANDFORM_CATEGORIES = {
  rivers: { ko: '주요 강', en: 'Major rivers', color: '#54B8E8', fact: '강물의 흐르는 길만 선으로 표시해요.' },
  mountains: { ko: '주요 산맥', en: 'Mountain ranges', color: '#C58AE8', fact: '높은 산들이 길게 이어진 곳이에요.' },
  plateaus: { ko: '주요 고원', en: 'Plateaus', color: '#D99A62', fact: '높지만 비교적 평평한 넓은 땅이에요.' },
  plains: { ko: '주요 평원', en: 'Plains', color: '#8BCB7C', fact: '낮고 평평한 넓은 땅이에요.' },
  deserts: { ko: '주요 사막', en: 'Deserts', color: '#E9C85A', fact: '비가 매우 적어 건조한 넓은 지역이에요.' },
};

export const EMPTY_LANDFORM_SELECTION = Object.freeze(Object.fromEntries(
  LANDFORM_CATEGORY_ORDER.map((key) => [key, false]),
));
