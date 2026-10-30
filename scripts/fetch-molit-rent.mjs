// 국토교통부 아파트 전월세 실거래 API 수집 (다산동만)
// 사용: node --env-file=.env.local scripts/fetch-molit-rent.mjs [개월 수=24]
// 출력: data/market/trades/molit-apt-rent-YYYYMM-YYYYMM.json  (키 값은 출력·저장하지 않는다)
import { writeFileSync, mkdirSync } from 'node:fs';

const KEY = process.env.MOLIT_APT_RENT_API_KEY;
const LAWD = process.env.MOLIT_LAWD_CD || '41360';
if (!KEY) {
  console.error('MOLIT_APT_RENT_API_KEY가 .env.local에 없습니다 (docs/ENV_SETUP.md 참고)');
  process.exit(1);
}
const months = Number(process.argv[2] ?? 24);
const ENDPOINT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const yms = Array.from({ length: months }, (_, i) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}`;
}).reverse();

const tag = (xml, name) => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? m[1].trim() : null;
};
const toNum = (v) => (v === null || v === '' ? null : Number(String(v).replace(/,/g, '')));

async function fetchMonth(ym) {
  const rows = [];
  for (let page = 1; page < 50; page++) {
    const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(KEY)}&LAWD_CD=${LAWD}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}`;
    const res = await fetch(url);
    const xml = await res.text();
    const code = tag(xml, 'resultCode');
    if (!res.ok || (code && code !== '00' && code !== '000')) {
      throw new Error(`${ym} p${page}: HTTP ${res.status} resultCode=${code} ${tag(xml, 'resultMsg') ?? ''}`.trim());
    }
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    for (const it of items) {
      if (tag(it, 'umdNm') !== '다산동') continue;
      rows.push({
        apt: tag(it, 'aptNm'),
        jibun: tag(it, 'jibun'),
        area: toNum(tag(it, 'excluUseAr')),
        depositManwon: toNum(tag(it, 'deposit')),
        monthlyRentManwon: toNum(tag(it, 'monthlyRent')),
        yearMonth: ym,
        day: toNum(tag(it, 'dealDay')),
        floor: toNum(tag(it, 'floor')),
        buildYear: tag(it, 'buildYear'),
        contractType: tag(it, 'contractType'),
      });
    }
    const total = toNum(tag(xml, 'totalCount')) ?? 0;
    if (page * 1000 >= total) break;
  }
  return rows;
}

const all = [];
for (const ym of yms) {
  const rows = await fetchMonth(ym);
  all.push(...rows);
  console.log(`${ym}: 다산동 ${rows.length}건`);
}
mkdirSync('data/market/trades', { recursive: true });
const out = `data/market/trades/molit-apt-rent-${yms[0]}-${yms.at(-1)}.json`;
writeFileSync(out, JSON.stringify(all));
console.log(`총 ${all.length}건 (전세 ${all.filter((r) => r.monthlyRentManwon === 0).length}건) → ${out}`);
