import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

test('feedback widget submits pending posts and toggles likes through RPCs', async () => {
  const widget = await read('public/feedback-board.js');

  assert.match(widget, /submit_feedback/);
  assert.match(widget, /list_feedback/);
  assert.match(widget, /toggle_feedback_like/);
  assert.match(widget, /ps_feedback_voter/);
  assert.match(widget, /backdrop-filter:blur/);
});

test('feedback database keeps posts private until an admin publishes them', async () => {
  const migration = await read('supabase/migrations/0009_feedback_board.sql');

  assert.match(migration, /create table if not exists public\.feedback_posts/i);
  assert.match(migration, /status\s+text\s+not null default 'pending'/i);
  assert.match(migration, /create or replace function public\.admin_set_feedback_status/i);
  assert.match(migration, /status = 'published'/i);
  assert.match(migration, /alter table public\.feedback_posts enable row level security/i);
});

test('Atlas, GeoWeb, and Spell Drill load one shared footer module', async () => {
  const atlas = await read('src/pages/atlas-gears.astro');
  const geo = await read('src/pages/world-map.astro');
  const spelling = await read('public/korean-spell-drill-parcyun/index.html');
  const footer = await read('src/components/PsFooter.astro');
  const sharedFooter = await read('public/ps-footer.js');

  assert.match(atlas, /<PsFooter showLinks=\{false\} \/>/);
  assert.match(geo, /import PsFooter from '\.\.\/components\/PsFooter\.astro'/);
  assert.doesNotMatch(geo, /WorldMapFooter/);
  assert.match(footer, /data-ps-footer/);
  assert.match(footer, /src="\/ps-footer\.js\?v=[^"]+"/);
  assert.doesNotMatch(footer, /class="ps-brand-fixed"/);
  assert.match(spelling, /data-ps-footer/);
  assert.match(spelling, /src="\.\.\/ps-footer\.js\?v=[^"]+"/);
  assert.doesNotMatch(spelling, /class="ps-brand-fixed"/);
  assert.match(spelling, /src="\.\.\/visitor-counter\.js"/);
  assert.match(spelling, /src="\.\.\/share-widget\.js"/);
  assert.match(sharedFooter, /class="ps-brand-fixed"/);
  assert.match(sharedFooter, /id="ps-coffee"/);
  assert.match(sharedFooter, /data-feedback-open/);
  assert.match(sharedFooter, /coffee-modal/);
  assert.match(sharedFooter, /--ps-brand-left/);
  assert.match(sharedFooter, /feedback-board\.js/);
});

test('homepage hides the feedback trigger without hiding it from other pages', async () => {
  const home = await read('src/pages/index.astro');
  const footer = await read('src/components/PsFooter.astro');

  assert.match(home, /showFeedback=\{false\}/);
  assert.match(footer, /showFeedback = true/);
  assert.match(footer, /data-show-feedback=\{String\(showFeedback\)\}/);
});

test('feedback modal uses the idea-focused copy and full-width input', async () => {
  const widget = await read('public/feedback-board.js');

  assert.match(widget, /개선 아이디어/);
  assert.match(widget, /당신의 아이디어가 대한민국 교실에서 실현됩니다!/);
  assert.match(widget, /display:block/);
});

test('shared footer module keeps the compact no-link baseline for Atlas and GeoWeb', async () => {
  const footer = await read('src/components/PsFooter.astro');
  const sharedFooter = await read('public/ps-footer.js');

  assert.match(footer, /showLinks = true/);
  assert.match(footer, /data-show-links=\{String\(showLinks\)\}/);
  assert.match(sharedFooter, /showLinks \? footerLinks : ''/);
  assert.match(sharedFooter, /'--ps-footer-h', footer \? footer\.getBoundingClientRect\(\)\.height \+ 'px' : '0px'/);
});

test('all shared-footer pages load the same Montserrat text weights', async () => {
  const atlas = await read('src/pages/atlas-gears.astro');
  const geo = await read('src/pages/world-map.astro');
  const spelling = await read('public/korean-spell-drill-parcyun/index.html');

  for (const page of [atlas, geo, spelling]) {
    assert.match(page, /Montserrat:wght@[^"']*300;400;500;600;700/);
  }
});

test('shared footer owns typography, color, and line-height instead of inheriting page tokens', async () => {
  const sharedFooter = await read('public/ps-footer.js');

  assert.match(sharedFooter, /font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif/);
  assert.match(sharedFooter, /line-height:normal/);
  assert.match(sharedFooter, /color:#8C8C8C/);
  assert.match(sharedFooter, /color:#FFB11A/);
  assert.match(sharedFooter, /host\.id = 'ps-footer-root'/);
});

test('coffee action opens a collaboration email hook instead of a QR donation modal', async () => {
  const sharedFooter = await read('public/ps-footer.js');
  const spelling = await read('public/korean-spell-drill-parcyun/index.html');

  assert.doesNotMatch(sharedFooter, /coffee-qr|coffee-qr-fallback|coffee-qr\.png/);
  assert.match(sharedFooter, /커피 대신, 같이 뭔가 만들어볼까요\?/);
  assert.match(sharedFooter, /pen\.layered@gmail\.com/);
  assert.match(sharedFooter, /mailto:pen\.layered@gmail\.com/);
  assert.doesNotMatch(spelling, /coffee-qr|coffee-qr-fallback|coffee-qr\.png/);
});

test('homepage carries the current studio positioning copy', async () => {
  const home = await read('src/pages/index.astro');

  assert.match(home, /Teacher\. Product Builder\. Education Studio\./);
  assert.match(home, /교육 현장을 가장 잘 이해하는 사람이,[\s\S]*좋은 교육 서비스를 만듭니다\./);
  assert.match(home, /초등학교 교사이자 교육용[\s\S]*프로덕트 개발자[\s\S]*교육 현장에 도움[\s\S]*해결[\s\S]*과정을 씁니다\./);
});

test('homepage positioning highlights the requested phrases in amber bold', async () => {
  const home = await read('src/pages/index.astro');

  assert.match(home, /<strong>좋은 교육 서비스를 만듭니다\.<\/strong>/);
  assert.match(home, /<span class="highlight">프로덕트 개발자<\/span>/);
  assert.match(home, /<span class="highlight">교육 현장에 도움<\/span>/);
  assert.match(home, /<span class="highlight">해결<\/span>/);
  assert.match(home, /좋은 교육 서비스를 만듭니다\.<\/strong><\/p>/);
  assert.match(home, /프로덕트 개발자<\/span>입니다\.<br>/);
  assert.match(home, /\.hero-tagline strong[\s\S]*font-weight: 700/);
  assert.match(home, /\.manifesto \.highlight[\s\S]*font-weight: 700/);
});

test('content studio stores careers and constrained design overrides behind administrator RPCs', async () => {
  const migration = await read('supabase/migrations/0010_content_studio.sql');

  assert.match(migration, /create table if not exists public\.career_sections/i);
  assert.match(migration, /create table if not exists public\.career_items/i);
  assert.match(migration, /create table if not exists public\.site_design/i);
  assert.match(migration, /alter table public\.career_sections enable row level security/i);
  assert.match(migration, /alter table public\.career_items enable row level security/i);
  assert.match(migration, /admin_save_career_item/i);
  assert.match(migration, /admin_delete_career_item/i);
  assert.match(migration, /admin_save_site_design/i);
  assert.match(migration, /admin_check\(p_pw\)/i);
});

test('content studio route contains a Figma-style inspector and career CRUD controls', async () => {
  const page = await read('src/pages/admin/components.astro');
  const studio = await read('src/components/ContentStudio.tsx');

  assert.match(page, /ContentStudio/);
  assert.match(studio, /디자인 설정/);
  assert.match(studio, /경력 추가/);
  assert.match(studio, /adminSaveCareerItem/);
  assert.match(studio, /iframe/);
});

test('all editable page shells load the current content runtime', async () => {
  const footer = await read('src/components/PsFooter.astro');
  const layout = await read('src/layouts/CinematicLayout.astro');
  const spelling = await read('public/korean-spell-drill-parcyun/index.html');

  assert.match(footer, /src="\/site-content\.js\?v=[^"]+"/);
  assert.match(layout, /src="\/site-content\.js\?v=[^"]+"/);
  assert.match(spelling, /src="\.\.\/site-content\.js\?v=[^"]+"/);
});

test('Design Studio is the single rounded administrator workspace', async () => {
  const studio = await read('src/components/ContentStudio.tsx');
  const login = await read('src/components/AdminLogin.tsx');
  const feedbackPage = await read('src/pages/feedback-admin.astro');
  const studioPage = await read('src/pages/admin/components.astro');

  assert.match(studio, /DESIGN STUDIO/i);
  assert.match(studio, /페이지 디자인/);
  assert.match(studio, /자료 관리/);
  assert.match(studio, /Works 관리/);
  assert.match(studio, /개선 요청/);
  assert.match(studioPage, /--ds-radius-control:12px/);
  assert.match(studioPage, /--ds-radius-panel:16px/);
  assert.match(studioPage, /--ds-radius-elevated:20px/);
  assert.match(login, /Design Studio/);
  assert.match(feedbackPage, /admin\/components\/\?mode=feedback/);
});
