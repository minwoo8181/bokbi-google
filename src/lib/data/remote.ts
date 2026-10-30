/**
 * 브라우저용 저장소 (Supabase 모드): 메서드마다 서버 액션(app/actions/data.ts)을 부른다.
 * 화면은 지금과 같은 Repos 인터페이스를 쓰므로 바뀌는 것이 없다. Date 인자·결과는 서버 액션이 그대로 주고받음
 */
import { repoCall } from '@/app/actions/data';
import type { Repos } from './repo';
import { REMOTE_METHODS } from './remoteMethods';

function group<G extends keyof Repos>(g: G): Repos[G] {
  const out: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  for (const m of REMOTE_METHODS[g]) out[m as string] = (...args) => repoCall(g, m as string, args);
  return out as unknown as Repos[G];
}

export function createRemoteRepos(): Repos {
  return {
    requests: group('requests'),
    offers: group('offers'),
    deals: group('deals'),
    visits: group('visits'),
    credits: group('credits'),
    applications: group('applications'),
    admin: group('admin'),
    contacts: group('contacts'),
  };
}
