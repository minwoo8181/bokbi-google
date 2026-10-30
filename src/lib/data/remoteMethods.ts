/**
 * 서버 액션으로 부를 수 있는 저장소 메서드 목록 (브라우저 프록시와 서버가 같이 씀).
 * 저장소 인터페이스(repo.ts)에 메서드를 추가하면 여기 없을 때 타입 오류 → 서버로 열리는 길을 목록으로만 관리
 */
import type { Repos } from './repo';

type Methods = { [G in keyof Repos]: readonly (keyof Repos[G])[] };
type Exhaustive<G extends keyof Repos, A extends readonly (keyof Repos[G])[]> = Exclude<keyof Repos[G], A[number]> extends never ? A : never;
const all = <G extends keyof Repos>() => <const A extends readonly (keyof Repos[G])[]>(a: Exhaustive<G, A>) => a;

export const REMOTE_METHODS: Methods = {
  requests: all<'requests'>()(['create', 'list', 'get', 'refresh', 'confirmMatch', 'release', 'setShowing', 'pause', 'resume', 'end', 'changePrice']),
  offers: all<'offers'>()(['send', 'confirmOwner', 'postAd', 'removeAd', 'setDelay', 'fileFakeReport', 'decideFakeReport']),
  deals: all<'deals'>()(['events', 'append']),
  visits: all<'visits'>()(['save']),
  credits: all<'credits'>()(['workspace', 'settle', 'tapMoreCredits', 'answerMoreCredits']),
  applications: all<'applications'>()(['get', 'save', 'recordConsents']),
  admin: all<'admin'>()(['actions', 'append', 'applications', 'decideApplication']),
  contacts: all<'contacts'>()(['reveal', 'accessLog']),
};

export function isRemoteMethod(group: string, method: string): group is keyof Repos {
  return Object.prototype.hasOwnProperty.call(REMOTE_METHODS, group) && (REMOTE_METHODS[group as keyof Repos] as readonly string[]).includes(method);
}
