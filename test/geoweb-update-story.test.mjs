import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { GEOWEB_UPDATE_VERSION, hasSeenGeoUpdate, markGeoUpdateSeen } from '../src/components/geoUpdateStory.js';

const source = () => readFile(new URL('../src/components/GlobeLab.jsx', import.meta.url), 'utf8');

test('GeoWeb update story is versioned and safely persisted', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  assert.equal(hasSeenGeoUpdate(storage), false);
  markGeoUpdateSeen(storage);
  assert.equal(values.get('parcyun:geoweb:update'), GEOWEB_UPDATE_VERSION);
  assert.equal(hasSeenGeoUpdate(storage), true);
  assert.equal(hasSeenGeoUpdate(null), false);
});

test('GeoWeb renders a friendly developer update story before the guide', async () => {
  const globe = await source();
  assert.match(globe, /className="update-story"/);
  assert.match(globe, /안녕하세요, 이 지도를 만드는 개발자예요/);
  assert.match(globe, /평면.+Focus Lens.+지구본/);
  assert.match(globe, /대륙.+대양/);
  assert.match(globe, /낮과 밤/);
  assert.match(globe, /위도.+경도/);
  assert.doesNotMatch(globe, /검색한 나라는 지도 한가운데로 부드럽게 다가옵니다/);
  assert.match(globe, />시작하기</);
  assert.match(globe, /업데이트 내역 보기/);
  assert.match(globe, /className=\{'update-history'/);
  assert.match(globe, /2026\.07/);
  assert.match(globe, /markGeoUpdateSeen\(window\.localStorage\)/);
  assert.match(globe, /setGuide\(true\)/);
});
