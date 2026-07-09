import { useCallback, useEffect, useState } from 'react';
import { sbSelect } from './supabase';
import { works as staticWorks, type Work } from '../data/works';

function fromRow(row: any): Work {
  return {
    num: row.num,
    title: row.title,
    titleHtml: row.title_html ?? row.title,
    desc: row.description ?? '',
    week: row.week ?? '',
    url: row.url ?? '',
    status: row.status ?? 'live',
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

export function useWorks() {
  const [items, setItems] = useState<Work[]>(staticWorks);
  const [source, setSource] = useState<'static' | 'db'>('static');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const rows = await sbSelect('works', '?select=*&order=sort.asc,created_at.asc');
      setItems(rows.map(fromRow));
      setSource('db');
    } catch {
      setItems(staticWorks);
      setSource('static');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, source, reload };
}
