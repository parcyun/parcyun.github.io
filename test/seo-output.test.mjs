import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const html = route => readFileSync(`dist/${route}index.html`, 'utf8');
const structured = source => [...source.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => {
  const data = JSON.parse(match[1]); return data['@graph'] || [data];
});

test('home connects Korean activity name, person, brand and website without hidden-only identity', () => {
  const source = html(''); const graph = structured(source);
  const person = graph.find(node => node['@type'] === 'Person');
  assert.equal(person.name, '박윤'); assert.equal(person.alternateName, 'parcyun');
  assert.ok(source.includes('parcyun(박윤)'));
  assert.ok(graph.some(node => node['@type'] === 'WebSite'));
  assert.equal(graph.find(node => node['@type'] === 'Organization').founder['@id'], person['@id']);
});

test('dexterity article has matching author, dates, image, canonical and breadcrumbs', () => {
  const source = html('dexterity/hyangmisa/'); const graph = structured(source);
  const post = graph.find(node => node['@type'] === 'BlogPosting');
  assert.equal(post.author['@id'], 'https://parcyun.github.io/#parcyun');
  assert.equal(post.author.name, '박윤');
  assert.ok(source.includes(`datetime="${post.datePublished}"`));
  assert.ok(new Date(post.dateModified) >= new Date(post.datePublished));
  assert.ok(source.includes(`rel="canonical" href="${post.url}"`));
  assert.ok(existsSync('dist' + new URL(post.image[0]).pathname));
  assert.equal(graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, post.url);
  assert.equal((source.match(/rel="canonical"/g) || []).length, 1);
  for (const image of source.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image[0], /width="\d+"/); assert.match(image[0], /height="\d+"/);
  }
});

test('gallery and RSS expose every published post and site map discovers it', () => {
  const source = html('dexterity/'); const blog = structured(source).find(node => node['@type'] === 'Blog');
  const feed = readFileSync('dist/dexterity/feed.xml', 'utf8');
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  assert.match(source, /<h1\b/); assert.match(source, /application\/rss\+xml/);
  for (const post of blog.blogPost) {
    assert.ok(feed.includes(post.url)); assert.ok(sitemap.includes(post.url));
    assert.ok(source.includes(new URL(post.url).pathname));
  }
});

test('shared pages get one absolute query-free canonical and social description', () => {
  for (const route of ['privacy/', 'terms/', 'reviews/', 'works/mdbf/', 'works/masterclass/']) {
    const source = html(route);
    assert.equal((source.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(source.includes(`href="https://parcyun.github.io/${route}"`));
    assert.match(source, /property="og:description"/);
    assert.match(source, /name="twitter:description"/);
  }
  assert.match(readFileSync('dist/footer-preview.html', 'utf8'), /name="robots" content="noindex"/);
});
