import { dexterityPosts } from '../../data/dexterity';
const xml = (value: string) => value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]!));
export function GET() {
  const items = dexterityPosts.map(post => {
    const url = `https://parcyun.github.io${post.href}`;
    return `<item><title>${xml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${xml(post.description)}</description><pubDate>${new Date(post.datePublished).toUTCString()}</pubDate><category>${xml(post.category)}</category></item>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>parcyun dexterity</title><link>https://parcyun.github.io/dexterity/</link><description>parcyun(박윤)의 일상·여행·카페 기록</description><language>ko</language><atom:link href="https://parcyun.github.io/dexterity/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
