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
 * 카테고리별 자료를 Supabase에서 런타임 로드. 실패(스키마 미적용 등)하면 정적 resources.ts로 즉시 폴백.
 * 관리자 CRUD 직후 reload() 호출하면 최신 목록을 다시 받아온다.
 */
export function useResources(category: Category) {
  const [items, setItems] = useState<Resource[]>(() => staticResources.filter((r) => r.category === category));
  const [source, setSource] = useState<'static' | 'db'>('static');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const rows = await sbSelect(
        'resources',
        `?select=*&category=eq.${encodeURIComponent(category)}&order=sort.asc,created_at.asc`
      );
      setItems(rows.map(fromRow));
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
