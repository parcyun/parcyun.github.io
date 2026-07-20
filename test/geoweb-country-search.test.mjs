import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { searchCountries, searchCountryMatches } from '../src/components/globeCountries.js';

const source = () => readFile(new URL('../src/components/GlobeLab.jsx', import.meta.url), 'utf8');

test('country search matches Korean, English, capital, and ISO codes', () => {
  for (const [query, lang] of [['대한민국', 'ko'], ['Korea', 'en'], ['서울', 'ko'], ['KR', 'ko']]) {
    assert.equal(searchCountries(query, lang).some((country) => country.iso2 === 'KR'), true);
  }
  assert.deepEqual(searchCountries('', 'ko'), []);
});

test('country search prioritizes exact names, understands common aliases, and labels typo matches', () => {
  const northKorea = searchCountryMatches('북한', 'ko');
  assert.equal(northKorea[0].country.iso2, 'KP');
  assert.equal(northKorea[0].matchType, 'alias');

  const typo = searchCountryMatches('대한민구', 'ko');
  assert.equal(typo[0].country.iso2, 'KR');
  assert.equal(typo[0].matchType, 'fuzzy');

  const exact = searchCountryMatches('대한민국', 'ko');
  assert.equal(exact[0].country.iso2, 'KR');
  assert.equal(exact[0].matchType, 'exact');
  assert.equal(exact.every((match, index, all) => index === 0 || all[index - 1].score >= match.score), true);
});

test('GeoWeb renders animated country search and complete country facts', async () => {
  const globe = await source();
  assert.match(globe, /className=\{'country-search'/);
  assert.match(globe, /aria-label=\{T\.countrySearch\}/);
  assert.match(globe, /matchType === 'fuzzy'/);
  assert.match(globe, /유사 결과/);
  assert.match(globe, /className="country-search-spinner"/);
  assert.match(globe, /className="floaty country-search-panel"/);
  assert.match(globe, /searchCountryMatches\(searchQuery, lang\)/);
  assert.match(globe, /formatPopulation/);
  assert.match(globe, /selectedCountry\.capital\[lang\]/);
  assert.match(globe, /selectedCountry\.flag/);
});

test('choosing a search result selects and focuses the country', async () => {
  const globe = await source();
  assert.match(globe, /function chooseCountry\(nextCountry\)/);
  assert.match(globe, /api\.current\.focusCountry\(nextCountry\)/);
  assert.match(globe, /focusCountry/);
  assert.match(globe, /S\.current\.focusReq/);
});

test('political and economic labels open animated explanatory popovers', async () => {
  const globe = await source();
  assert.match(globe, /SYSTEM_EXPLANATIONS/);
  assert.match(globe, /systemPopover\?\.country === sel\?\.name/);
  assert.match(globe, /systemPopover\?\.type === 'political'/);
  assert.match(globe, /systemPopover\?\.type === 'economic'/);
  assert.match(globe, /className="system-popover"/);
  assert.match(globe, /event\.key === 'Escape'/);
  assert.doesNotMatch(globe, /useEffect\(\(\)=>\{setSystemPopover\(null\);\},\[sel\]\)/);
});
