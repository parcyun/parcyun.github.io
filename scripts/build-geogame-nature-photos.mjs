import { writeFile } from 'node:fs/promises';

// One representative photograph per named landform. Wikimedia Commons file pages
// provide the author and license displayed beside each image in the game.
const files = new Map([
  ['mountains:알프스산맥', 'Aletschgebiet aus dem Flugzeug.jpg'],
  ['mountains:히말라야산맥', 'Himalayas, Pheriche, Nepal.jpg'],
  ['mountains:우랄산맥', 'Landscape view in Circumpolar Urals.jpg'],
  ['mountains:캅카스산맥', 'Elbrus view on the mountains.jpg'],
  ['mountains:아틀라스산맥', 'Plateau Yagour, Agdal, Morocco.jpg'],
  ['mountains:로키산맥', 'Maroon Bells (11553)a.jpg'],
  ['mountains:애팔래치아산맥', 'Blue Ridge Parkway Sunset (43691100).jpeg'],
  ['mountains:안데스산맥', 'Panoramic view Andes-Chile.jpg'],
  ['mountains:그레이트디바이딩산맥', 'Mt. Feathertop444 edit.jpg'],
  ['plateaus:에티오피아고원', 'Semien Mountains 13.jpg'],
  ['plateaus:데칸고원', 'Dekánská krajina u Hajdarábádu.jpg'],
  ['plateaus:티베트고원', 'Nomads near Namtso.jpg'],
  ['plateaus:브라질고원', 'Pedra da Mina.jpg'],
  ['plateaus:중앙시베리아고원', 'Plato Putorana 01.jpg'],
  ['plateaus:몽골고원', 'Fall Nature in Mongolia.jpg'],
  ['plateaus:콜로라도고원', 'Capitol Reef National Park.jpg'],
  ['plateaus:알티플라노고원', '00 1671 South America - Altiplano de Bolivia.jpg'],
  ['plains:북유럽평원', 'Mitteleuropäisches Tiefland.jpg'],
  ['plains:화베이평원', 'NorthChinaPlain.jpg'],
  ['plains:그레이트플레인스', 'Mixed grass prairie Fort Smith Montana.jpg'],
  ['plains:서시베리아평원', 'Siberian plain.jpg'],
  ['plains:갠지스평원', 'Farmland in gange plain.jpg'],
  ['plains:만주평원', '东北大雨过后的稻田.jpg'],
  ['plains:팜파스', 'Pampas.jpg'],
  ['plains:야노스', 'Los Llanos Colombia by David.png'],
  ['plains:그란차코', 'Chaco Boreal Paraguay.jpg'],
  ['plains:중앙아시아 평원·저지', 'Steppe.jpg'],
  ['deserts:사하라 사막', 'Merzouga Dunes 2011.jpg'],
  ['deserts:고비 사막', 'Gobi Desert.jpg'],
  ['deserts:아라비아 사막', 'Arabian Desert - panoramio.jpg'],
  ['deserts:타르 사막', 'Thar desert Rajasthan India.jpg'],
  ['deserts:타클라마칸 사막', 'Taklamakan desert.jpg'],
  ['deserts:중앙아시아 사막권', 'Karakum Desert, Turkmenistan.jpg'],
  ['deserts:칼라하리 사막', 'Sand dune in the Kalahari Desert (Namibia).jpg'],
  ['deserts:나미브 사막', 'Sossusvlei Dune Namib Desert Namibia Luca Galuzzi 2004.JPG'],
  ['deserts:아타카마 사막', 'Atacama Desert between Antofagasta and Taltal.jpg'],
  ['deserts:파타고니아 사막', 'Patagonia Argentina (180435879).jpeg'],
  ['deserts:오스트레일리아 사막권', 'Andado2 - Christopher Watson.jpg'],
  ['rivers:나일강', 'Beautiful nature along Nile River 01.jpg'],
  ['rivers:인더스강', 'Nanga Parbat Indus Gorge.jpg'],
  ['rivers:갠지스강', 'Varanasiganga.jpg'],
  ['rivers:메콩강', 'Mekong-River-Near-Luang-Prabang.jpg'],
  ['rivers:황허강', 'Yellow River - panoramio.jpg'],
  ['rivers:양쯔강', 'Dusk on the Yangtze River.jpg'],
  ['rivers:미시시피강', 'Meandering Mississippi (5182095595).jpg'],
  ['rivers:아마존강', 'Amazonas, Iquitos - Leticia, Kolumbien (11472506936).jpg'],
  ['rivers:콩고강', 'Aerial view of the Congo River near Kisangani.jpg'],
  ['rivers:다뉴브강', 'View from Gellért Hill to the Danube, Hungary - Budapest (28493220635).jpg'],
  ['rivers:볼가강', 'Frozen Volga River -a.jpg'],
  ['rivers:오비강', 'March evening. The sun fell across the Ob river.jpg'],
  ['rivers:예니세이강', 'Слияние рек Енисей.jpg'],
  ['rivers:레나강', 'Lena River Delta IMG 20140908 201936.jpg'],
]);

const stripHtml = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&(?:amp|quot|lt|gt|nbsp);/g, entity => ({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&nbsp;':' '}[entity])).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).trim();
const output = {};
const entries = [...files];
for (let start = 0; start < entries.length; start += 8) {
  const batch = entries.slice(start, start + 8);
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'960',titles:batch.map(([, name]) => `File:${name}`).join('|')});
  const response = await fetch(url, {headers:{'User-Agent':'GeoWeb educational game (https://parcyun.github.io/world-map/)'}});
  if (!response.ok) throw new Error(`Commons HTTP ${response.status} for batch ${start + 1}`);
  const data = await response.json();
  const images = new Map((data.query?.pages || []).map(page => [page.title.replace(/^File:/, '').replaceAll('_', ' '), page.imageinfo?.[0]]));
  for (const [id, name] of batch) {
    const info = images.get(name.replaceAll('_', ' '));
    if (!info?.url || !info?.descriptionurl) throw new Error(`Image missing: ${id} (${name})`);
    const meta = info.extmetadata || {};
    const license = stripHtml(meta.LicenseShortName?.value);
    const licenseUrl = meta.LicenseUrl?.value || info.descriptionurl;
    if (!/^(CC BY(?:-SA)?|CC0|Public domain)/i.test(license)) throw new Error(`Unsupported license for ${id}: ${license}`);
    output[id] = {image:info.thumburl || info.url, source:info.descriptionurl, author:stripHtml(meta.Artist?.value || meta.Attribution?.value) || 'Wikimedia Commons', license, licenseUrl};
  }
  await new Promise(resolve => setTimeout(resolve, 1500));
}
await writeFile(new URL('../src/components/geoGameNaturePhotos.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(`Verified ${Object.keys(output).length} natural-landform photos and licenses.`);
