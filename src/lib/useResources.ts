import { useCallback, useEffect, useState } from 'react';
import { sbSelect } from './supabase';
import { resources as staticResources, type Resource, type Category } from '../data/resources';

/** DB 행 shape → 사이트에서 쓰는 Resource shape으로 변환 */
function fromRow(row: any): Resource {
  return {
    id: row.id,
    title: row.title,
    desc: row.description ?? '',
    url: row.url,
    external: !!row.external,
    category: row.category,
    type: row.type,
    subject: row.subject ?? '',
    thumb: row.thumb ?? '',
    lid: row.lid ?? '',
    posterTitle: row.poster_title ?? '',
    date: row.date ?? '',
    meta: Array.isArray(row.meta) ? row.meta : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

/**
 * 카테고리별 자료: 정적 resources.ts = 기본 카탈로그(안전망), Supabase = 관리자 오버라이드.
 * 정적을 기본으로 깔고 DB 행을 id로 덮어쓰며(수정), DB에만 있는 행은 뒤에 추가(신규).
 * → DB가 비었거나 특정 항목이 없어도 정적 콘텐츠가 절대 사라지지 않는다.
 * 관리자 CRUD 직후 reload() 호출하면 최신 목록을 다시 받아온다.
 * ※ 정적 항목을 관리자에서 삭제하면 DB에선 지워지지만 정적에서 다시 살아난다(진짜 제거는 resources.ts에서).
 */
export function useResources(category: Category) {
  const staticForCat = staticResources.filter((r) => r.category === category);
  const [items, setItems] = useState<Resource[]>(() => staticForCat);
  const [source, setSource] = useState<'static' | 'db'>('static');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const rows = (await sbSelect(
        'resources',
        `?select=*&category=eq.${encodeURIComponent(category)}&order=sort.asc,created_at.asc`
      )).map(fromRow);
      const dbById = new Map(rows.map((r) => [r.id, r]));
      const base = staticResources.filter((r) => r.category === category);
      const staticIds = new Set(base.map((r) => r.id));
      const merged = base.map((r) => dbById.get(r.id) ?? r);      // 정적 순서 유지 + DB로 덮어쓰기
      const dbOnly = rows.filter((r) => !staticIds.has(r.id));    // DB에만 있는 신규 항목
      setItems([...merged, ...dbOnly]);
      setSource('db');
    } catch {
      setItems(staticResources.filter((r) => r.category === category));
      setSource('static');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, source, reload };
}
