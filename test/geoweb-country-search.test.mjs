import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { searchCountries } from '../src/components/globeCountries.js';

const source = () => readFile(new URL('../src/components/GlobeLab.jsx', import.meta.url), 'utf8');

test('country search matches Korean, English, capital, and ISO codes', () => {
  for (const [query, lang] of [['대한민국', 'ko'], ['Korea', 'en'], ['서울', 'ko'], ['KR', 'ko']]) {
    assert.equal(searchCountries(query, lang).some((country) => country.iso2 === 'KR'), true);
  }
  assert.deepEqual(searchCountries('', 'ko'), []);
});

test('GeoWeb renders animated country search and complete country facts', async () => {
  const globe = await source();
  assert.match(globe, /className=\{'country-search'/);
  assert.match(globe, /aria-label=\{T\.countrySearch\}/);
  assert.match(globe, /searchCountries\(searchQuery, lang\)/);
  assert.match(globe, /className="country-search-spinner"/);
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
  assert.match(globe, /aria-expanded=\{systemPopover === 'political'\}/);
  assert.match(globe, /aria-expanded=\{systemPopover === 'economic'\}/);
  assert.match(globe, /className="system-popover"/);
  assert.match(globe, /event\.key === 'Escape'/);
});
