// 명단 전체 주소의 VWorld 좌표 변환 성공률 점검 (자동 채점). 좌표는 저장하지 않고 개수·실패 주소만 출력 (VWorld 약관: 지오코딩 결과 저장 금지)
// 호출 수 = 명단 수(336), 하루 한도 40,000건. 명단을 새로 받았을 때만 돌린다
// 사용: node --env-file=.env.local scripts/check-office-geocode.mts
import { readFileSync } from 'node:fs';
import { geocodeQuery, parseGeocodeResponse, vworldGeocodeUrl } from '../src/lib/requests/officeMap.ts';

const key = process.env.V_WORLD_MAP_API_KEY;
if (!key) throw new Error('V_WORLD_MAP_API_KEY 없음 (.env.local)');

const { offices } = JSON.parse(readFileSync('src/data/brokers/dasan-offices.json', 'utf8')) as { offices: { regNo: string; office: string; address: string }[] };
let ok = 0;
const failed: string[] = [];
for (const o of offices) {
  const q = geocodeQuery(o.address);
  const res = q ? await fetch(vworldGeocodeUrl(q, key)) : null;
  const point = res?.ok ? parseGeocodeResponse(await res.json().catch(() => null)) : null;
  if (point) ok++;
  else failed.push(`${o.regNo} ${o.office} | ${q?.type} ${q?.address}`);
}
console.log(`성공 ${ok}/${offices.length} (${((ok / offices.length) * 100).toFixed(1)}%)`);
for (const f of failed) console.log('실패', f);
