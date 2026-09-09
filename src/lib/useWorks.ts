import { useCallback, useEffect, useState } from 'react';
import { sbSelect } from './supabase';
import { sortWorksForPortfolio, works as staticWorks, type Work } from '../data/works';

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

export function mergeWorks(databaseWorks: Work[], bundledWorks: Work[] = staticWorks): Work[] {
  const databaseNums = new Set(databaseWorks.map((work) => work.num));
  return sortWorksForPortfolio([
    ...databaseWorks,
    ...bundledWorks.filter((work) => !databaseNums.has(work.num)),
  ]);
}

export function useWorks() {
  const [items, setItems] = useState<Work[]>(staticWorks);
  const [source, setSource] = useState<'static' | 'db'>('static');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const rows = await sbSelect('works', '?select=*&order=sort.asc,created_at.asc');
      // DB에서 편집한 항목을 우선하고, 아직 DB에 등록되지 않은 번들 Works는 보충한다.
      setItems(mergeWorks(rows.map(fromRow)));
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
