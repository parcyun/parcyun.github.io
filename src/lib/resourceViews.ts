import { sbRpc } from './supabase';
import type { Resource } from '../data/resources';

export type ResourceViewTotals = Record<string, number>;

function dayKey() {
  const shifted = new Date(Date.now() - 6 * 60 * 60 * 1000);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(shifted);
  } catch {
    return shifted.toISOString().slice(0, 10);
  }
}

function countedKey(resourceId: string) {
  return `ps_resource_viewed:${dayKey()}:${resourceId}`;
}

export async function loadResourceViewTotals(resources: Pick<Resource, 'id' | 'visitPath'>[]): Promise<ResourceViewTotals> {
  const resourceIds = [...new Set(resources.map((resource) => resource.id))];
  const visitPaths = [...new Set(resources.flatMap((resource) => resource.visitPath ? [resource.visitPath] : []))];
  const [clickRows, serviceRows] = await Promise.all([
    sbRpc<Array<{ resource_id: string; total: number }>>('list_resource_click_totals', { p_resource_ids: resourceIds }),
    visitPaths.length ? sbRpc<Array<{ path: string; total: number }>>('list_page_visit_totals', { p_paths: visitPaths }) : Promise.resolve([]),
  ]);
  const clicks = Object.fromEntries((clickRows || []).map(({ resource_id, total }) => [resource_id, Number(total) || 0]));
  const services = Object.fromEntries((serviceRows || []).map(({ path, total }) => [path, Number(total) || 0]));
  return Object.fromEntries(resources.map((resource) => [
    resource.id,
    resource.visitPath ? (services[resource.visitPath] || 0) : (clicks[resource.id] || 0),
  ]));
}

// 같은 브라우저에서 같은 자료를 같은 수업일에 다시 열어도 조회수를 부풀리지 않는다.
export async function recordResourceView(resourceId: string): Promise<boolean> {
  try {
    const key = countedKey(resourceId);
    if (localStorage.getItem(key) === '1') return false;
    await sbRpc('bump_resource', { p_resource_id: resourceId, p_kind: 'click' });
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}
