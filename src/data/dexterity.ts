import {gameGuides} from './gameGuides';
// Publication time comes from the first public article commit; update modified
// only for real editorial changes, never automatically on every site build.
export const dexterityAuthor = {
  '@type': 'Person', '@id': 'https://parcyun.github.io/#parcyun',
  name: '박윤', alternateName: 'parcyun', url: 'https://parcyun.github.io/',
};
export const dexterityPosts = [{
  slug: 'hyangmisa', title: '경주체육관 간판 아래, 향미사', category: '맛집',
  description: '경주 카페 향미사에서 따뜻한 아메리카노를 테이크아웃하고 케냐 캄완기 AA TOP 워시드 원두를 구매한 기록. 경주체육관 간판과 매대 앞 바 좌석, 방문 당시 메뉴를 사진 9장과 함께 담았습니다.',
  href: '/dexterity/hyangmisa/', image: '/images/dexterity/hyangmisa/hyangmisa-exterior.png',
  imageAlt: '경주체육관 간판이 남아 있는 경주 카페 향미사 입구',
  datePublished: '2026-11-15T13:26:30+09:00', dateModified: '2026-11-17T12:31:19+09:00',
}, ...gameGuides.map(guide=>({slug:'guidebook/'+guide.id,title:guide.title,category:'가이드북',description:guide.description,href:`/dexterity/guidebook/${guide.id}/`,image:guide.thumbnail,imageAlt:`${guide.name} 가이드북`,datePublished:'2026-11-19',dateModified:'2026-11-19'}))];
