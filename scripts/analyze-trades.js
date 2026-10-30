const fs = require('fs');
const path = require('path');

const supabaseDir = path.join(__dirname, '..', 'supabase');
const files = fs.readdirSync(supabaseDir).filter(f => f.endsWith('.csv'));
const decoder = new TextDecoder('euc-kr');

let allTrades = [];

for (const f of files) {
  const filePath = path.join(supabaseDir, f);
  const buf = fs.readFileSync(filePath);
  const text = decoder.decode(buf);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const headerIdx = lines.findIndex(l => l.includes('단지명'));
  if (headerIdx === -1) continue;

  const header = lines[headerIdx].split(',').map(s => s.replace(/"/g, '').trim());
  const nameIdx = header.indexOf('단지명');
  const areaIdx = header.indexOf('전용면적(㎡)');
  const yyyymmIdx = header.indexOf('계약년월');
  const dayIdx = header.indexOf('계약일');
  const priceIdx = header.indexOf('거래금액(만원)');
  const floorIdx = header.indexOf('층');
  const dongIdx = header.indexOf('동');
  const cancelIdx = header.indexOf('해제사유발생일');
  const typeIdx = header.indexOf('거래유형');

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    // Simple CSV parse handling quotes
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    const parts = [];
    let match;
    while ((match = regex.exec(raw)) !== null) {
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      parts.push(val ? val.trim() : '');
      if (regex.lastIndex === 0) break;
    }

    if (parts.length < header.length) continue;

    // Check cancellation
    if (cancelIdx !== -1 && parts[cancelIdx] && parts[cancelIdx] !== '-' && parts[cancelIdx] !== '') {
      continue;
    }

    const priceStr = (parts[priceIdx] || '0').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    if (!price || isNaN(price)) continue;

    allTrades.push({
      complexName: parts[nameIdx],
      area: parseFloat(parts[areaIdx]) || 0,
      yearMonth: parts[yyyymmIdx],
      day: parts[dayIdx],
      price,
      dong: dongIdx !== -1 ? parts[dongIdx] : '',
      floor: floorIdx !== -1 ? parts[floorIdx] : '',
      type: typeIdx !== -1 ? parts[typeIdx] : '',
      sourceFile: f
    });
  }
}

// Deduplicate trades by complexName + area + yearMonth + day + floor + price
const uniqueTradesMap = new Map();
for (const t of allTrades) {
  const key = `${t.complexName}_${t.area}_${t.yearMonth}_${t.day}_${t.floor}_${t.price}`;
  if (!uniqueTradesMap.has(key)) {
    uniqueTradesMap.set(key, t);
  }
}

const uniqueTrades = Array.from(uniqueTradesMap.values());

console.log('=== 전체 수집 통계 ===');
console.log('전체 로우 수 (중복 포함):', allTrades.length);
console.log('고유 실거래 건수 (해제 거래 제외 및 중복 제거):', uniqueTrades.length);

// 거래년월 분포
const ymCounts = {};
uniqueTrades.forEach(t => {
  ymCounts[t.yearMonth] = (ymCounts[t.yearMonth] || 0) + 1;
});

const sortedYMs = Object.keys(ymCounts).sort().reverse();
console.log('\n=== 월별 실거래 분포 (최근순) ===');
sortedYMs.forEach(ym => {
  console.log(`${ym}: ${ymCounts[ym]}건`);
});

// 최근 6개월 선정
const latest6Months = sortedYMs.slice(0, 6);
console.log('\n최근 6개월 구간:', latest6Months.join(', '));

const trades6m = uniqueTrades.filter(t => latest6Months.includes(t.yearMonth));
console.log(`최근 6개월 총 실거래 건수: ${trades6m.length}건`);

// 단지별 최근 6개월 거래량
const complexCounts6m = {};
trades6m.forEach(t => {
  complexCounts6m[t.complexName] = (complexCounts6m[t.complexName] || 0) + 1;
});

const sortedComplexes = Object.entries(complexCounts6m).sort((a, b) => b[1] - a[1]);

console.log('\n=== 단지별 최근 6개월 실거래 건수 (상위 30개 단지) ===');
sortedComplexes.slice(0, 30).forEach(([name, cnt], i) => {
  const sample = trades6m.filter(t => t.complexName === name).slice(0, 2);
  const sampleInfo = sample.map(s => `${s.yearMonth}.${s.day} (${s.floor}층, ${s.price}만)`).join(', ');
  console.log(`${(i+1).toString().padStart(2, ' ')}. ${name.padEnd(24, ' ')}: ${cnt}건  [샘플: ${sampleInfo}]`);
});

// 주요 대표 단지 (다산자이, 힐스테이트 등) 상세 검증
console.log('\n=== 주요 관심 단지별 6개월 거래 건수 정밀 확인 ===');
const targetComplexes = [
  '다산자이아이비플레이스',
  '힐스테이트다산',
  '다산자연앤e편한세상3차',
  '다산한강반도유보라',
  '다산유승한내들골든뷰',
  '다산푸르지오',
  '다산롯데캐슬',
  '플루리움',
  '부영사랑으로'
];

targetComplexes.forEach(target => {
  const matched = sortedComplexes.filter(([name]) => name.includes(target) || target.includes(name));
  const totalInTarget = matched.reduce((sum, [, c]) => sum + c, 0);
  console.log(`- ${target}: 총 ${totalInTarget}건 (${matched.map(([n, c]) => `${n} ${c}건`).join(', ') || '0건'})`);
});
