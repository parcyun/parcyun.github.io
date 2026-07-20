import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('GeoWeb ships a complete static UN-195 country dataset', async () => {
  const { COUNTRIES } = await import('../src/components/globeCountries.js');
  assert.equal(COUNTRIES.length, 195);
  assert.equal(new Set(COUNTRIES.map((country) => country.iso2)).size, 195);
  assert.equal(new Set(COUNTRIES.map((country) => country.iso3)).size, 195);

  for (const country of COUNTRIES) {
    assert.match(country.iso2, /^[A-Z]{2}$/);
    assert.match(country.iso3, /^[A-Z]{3}$/);
    assert.ok(country.name.ko && country.name.en, `${country.iso2}: bilingual country name`);
    assert.ok(country.capital.ko && country.capital.en, `${country.iso2}: bilingual capital`);
    assert.ok(Number.isInteger(country.population) && country.population > 0, `${country.iso2}: population`);
    assert.ok(Number.isInteger(country.populationYear), `${country.iso2}: population year`);
    assert.equal(country.coordinates.length, 2, `${country.iso2}: coordinates`);
    assert.ok(['democratic_republic', 'constitutional_monarchy', 'absolute_monarchy', 'one_party', 'transitional_special'].includes(country.politicalSystem));
    assert.ok(['market', 'mixed', 'socialist_market', 'planned'].includes(country.economicSystem));
    assert.equal(country.flag, `/flags/${country.iso2.toLowerCase()}.webp`);
    await access(new URL(`../public${country.flag}`, import.meta.url));
  }
});

test('GeoWeb country source is static and includes system explanations', async () => {
  const source = await readFile(new URL('../src/components/globeCountries.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\//i);
  assert.match(source, /SYSTEM_EXPLANATIONS/);
  assert.match(source, /searchCountries/);
  assert.match(source, /countryByBoundaryName/);
});
