import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COUNTRY as LEGACY_COUNTRIES } from '../src/components/globeCountryData.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const restCountriesCommit = '43f6260db10c54df9972e6e554ee14c2e7c85ef5';
const restCountriesUrl = `https://gitlab.com/restcountries/restcountries/-/raw/${restCountriesCommit}/src/main/resources/countriesV3.1.json`;
const flagsDir = new URL('../public/flags/', import.meta.url);
const outputFile = new URL('../src/components/globeCountries.js', import.meta.url);

const POLITICAL = {
  constitutional_monarchy: new Set('AD AG AU BS BE BZ BT CA KH DK GD JM JP JO KW LS LI LU MY MC MA NL NZ NO PG KN LC VC SB ES SE TH TO TV GB'.split(' ')),
  absolute_monarchy: new Set('BH BN SZ OM QA SA AE VA'.split(' ')),
  one_party: new Set('CN CU KP LA VN'.split(' ')),
  transitional_special: new Set('AF BA ER HT LY ML MM NE PS SO SS SD SY YE'.split(' ')),
};
const ECONOMIC = {
  market: new Set('AU AT BE CA CL CY CZ DK EE FI FR DE IS IE IL IT JP LV LT LU MT NL NZ NO PL PT SG SK SI KR ES SE CH GB US UY'.split(' ')),
  socialist_market: new Set('CN LA VN'.split(' ')),
  planned: new Set('CU KP'.split(' ')),
};
const GOV_TO_SIMPLE = {
  constmon: 'constitutional_monarchy', fedconst: 'constitutional_monarchy', fedmon: 'constitutional_monarchy',
  absmon: 'absolute_monarchy', theo: 'transitional_special', mil: 'transitional_special',
  onep: 'one_party', comm: 'one_party',
};
const ECON_TO_SIMPLE = {
  cap: 'market', welfare: 'market', socmkt2: 'market', oil: 'mixed',
  socmkt: 'socialist_market', plan: 'planned', mixed: 'mixed',
};

function classification(iso2, legacy) {
  let politicalSystem = GOV_TO_SIMPLE[legacy?.gov] || 'democratic_republic';
  let economicSystem = ECON_TO_SIMPLE[legacy?.econ] || 'mixed';
  for (const [key, codes] of Object.entries(POLITICAL)) if (codes.has(iso2)) politicalSystem = key;
  for (const [key, codes] of Object.entries(ECONOMIC)) if (codes.has(iso2)) economicSystem = key;
  return { politicalSystem, economicSystem };
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
    child.on('error', reject);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function wikidataCapitals(iso2Codes) {
  const values = iso2Codes.map((code) => `"${code}"`).join(' ');
  const query = `SELECT ?iso2 ?capitalLabel WHERE {
    VALUES ?iso2 { ${values} }
    ?country wdt:P297 ?iso2.
    OPTIONAL { ?country wdt:P36 ?capital. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
  }`;
  const data = await fetchJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'parcyun-studio-geoweb/1.0 (https://parcyun.github.io/world-map/)' },
  });
  const capitals = new Map();
  for (const row of data.results.bindings) {
    if (!row.capitalLabel?.value || /^Q\d+$/.test(row.capitalLabel.value)) continue;
    const list = capitals.get(row.iso2.value) || [];
    if (!list.includes(row.capitalLabel.value)) list.push(row.capitalLabel.value);
    capitals.set(row.iso2.value, list);
  }
  return capitals;
}

async function downloadFlag(country) {
  const iso = country.cca2.toLowerCase();
  const target = new URL(`${iso}.webp`, flagsDir);
  try {
    await readFile(target);
    return;
  } catch {}
  const response = await fetch(`https://flagcdn.com/w320/${iso}.png`);
  if (!response.ok) throw new Error(`flag ${iso}: ${response.status}`);
  const png = new URL(`${iso}.png`, flagsDir);
  await writeFile(png, Buffer.from(await response.arrayBuffer()));
  await run('/opt/homebrew/bin/cwebp', ['-quiet', '-q', '82', '-resize', '256', '0', fileURLToPath(png), '-o', fileURLToPath(target)]);
  await unlink(png);
}

const rawCountries = await fetchJson(restCountriesUrl);
const un195 = rawCountries
  .filter((country) => country.unMember || ['GNB', 'PSE', 'VAT'].includes(country.cca3))
  .sort((a, b) => a.cca2.localeCompare(b.cca2));
if (un195.length !== 195) throw new Error(`Expected 195 countries, received ${un195.length}`);

const legacyByIso2 = new Map(Object.entries(LEGACY_COUNTRIES).map(([boundaryName, value]) => [value.iso2, { ...value, boundaryName }]));
const capitalsKo = await wikidataCapitals(un195.map((country) => country.cca2));
await mkdir(flagsDir, { recursive: true });

let cursor = 0;
await Promise.all(Array.from({ length: 10 }, async () => {
  while (cursor < un195.length) {
    const country = un195[cursor++];
    await downloadFlag(country);
  }
}));

const countries = un195.map((country) => {
  const legacy = legacyByIso2.get(country.cca2);
  const capitalEn = (country.capital || []).join(' · ') || country.name.common;
  const capitalKo = (capitalsKo.get(country.cca2) || []).join(' · ') || capitalEn;
  const coordinates = country.capitalInfo?.latlng?.length === 2 ? [country.capitalInfo.latlng[1], country.capitalInfo.latlng[0]] : [country.latlng[1], country.latlng[0]];
  return {
    iso2: country.cca2,
    iso3: country.cca3,
    name: {
      ko: country.translations?.kor?.common || legacy?.ko || country.name.common,
      en: country.name.common,
    },
    officialName: {
      ko: country.translations?.kor?.official || legacy?.ko || country.name.official,
      en: country.name.official,
    },
    capital: { ko: capitalKo, en: capitalEn },
    population: country.population,
    populationYear: 2023,
    coordinates,
    continent: country.continents?.[0] || country.region,
    boundaryName: legacy?.boundaryName || country.name.common,
    ...classification(country.cca2, legacy),
    flag: `/flags/${country.cca2.toLowerCase()}.webp`,
  };
});

const banner = `// Generated by scripts/build-country-data.mjs from REST Countries commit ${restCountriesCommit} and Wikidata Korean capital labels.
// Runtime is fully static: this module makes no network requests.
`;
const helpers = `
export const SYSTEM_LABELS = {
  political: {
    democratic_republic: { ko: '민주공화국', en: 'Democratic republic' },
    constitutional_monarchy: { ko: '입헌군주국', en: 'Constitutional monarchy' },
    absolute_monarchy: { ko: '전제군주국', en: 'Absolute monarchy' },
    one_party: { ko: '일당제', en: 'One-party state' },
    transitional_special: { ko: '과도정부·특수', en: 'Transitional or special system' },
  },
  economic: {
    market: { ko: '시장경제', en: 'Market economy' },
    mixed: { ko: '혼합경제', en: 'Mixed economy' },
    socialist_market: { ko: '사회주의 시장경제', en: 'Socialist market economy' },
    planned: { ko: '계획경제', en: 'Planned economy' },
  },
};
export const SYSTEM_EXPLANATIONS = {
  political: {
    democratic_republic: { ko: '시민이 선거로 대표를 뽑고, 헌법에 따라 국가를 운영하는 체제예요.', en: 'Citizens elect representatives and the state operates under a constitution.' },
    constitutional_monarchy: { ko: '국왕이 있지만 헌법과 의회가 국가 운영의 중심이 되는 체제예요.', en: 'A monarch remains head of state while a constitution and parliament guide government.' },
    absolute_monarchy: { ko: '국왕이 국가 운영에서 매우 큰 권한을 갖는 체제예요.', en: 'A monarch holds extensive authority over the government.' },
    one_party: { ko: '하나의 정당이 국가 운영을 주도하는 체제예요.', en: 'One political party leads the government.' },
    transitional_special: { ko: '분쟁, 과도정부, 복합 구조 등으로 한 가지 형태로 설명하기 어려운 체제예요.', en: 'Conflict, transition, or a special constitutional structure makes one simple label difficult.' },
  },
  economic: {
    market: { ko: '기업과 소비자의 선택, 시장 가격이 경제 활동을 주로 이끄는 체제예요.', en: 'Businesses, consumers, and market prices mainly guide economic activity.' },
    mixed: { ko: '시장 활동과 정부의 조정·공공 서비스가 함께 작동하는 체제예요.', en: 'Markets operate alongside government coordination and public services.' },
    socialist_market: { ko: '사회주의 국가 운영 아래 시장 원리를 함께 활용하는 체제예요.', en: 'Market mechanisms operate within a socialist state framework.' },
    planned: { ko: '국가가 생산과 분배의 많은 부분을 계획하고 조정하는 체제예요.', en: 'The state plans and coordinates much of production and distribution.' },
  },
};
export const COUNTRY_BY_ISO2 = new Map(COUNTRIES.map((country) => [country.iso2, country]));
const normalizeSearch = (value) => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
export function searchCountries(query, lang = 'ko') {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  return COUNTRIES.filter((country) => [
    country.name[lang] || country.name.ko,
    country.name.ko,
    country.name.en,
    country.officialName[lang] || country.officialName.ko,
    country.officialName.ko,
    country.officialName.en,
    country.capital[lang] || country.capital.ko,
    country.capital.ko,
    country.capital.en,
    country.iso2,
    country.iso3,
  ].some((value) => normalizeSearch(value).includes(needle))).slice(0, 8);
}
export function countryByBoundaryName(name) {
  return COUNTRIES.find((country) => country.boundaryName === name || country.name.en === name) || null;
}
export function formatPopulation(value, lang = 'ko') {
  return new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
`;
await writeFile(outputFile, `${banner}export const COUNTRIES = ${JSON.stringify(countries, null, 2)};\n${helpers}`);
console.log(`Wrote ${countries.length} countries and flags to ${root}`);
