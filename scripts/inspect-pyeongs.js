const fs = require('fs');
const path = require('path');
const decoder = new TextDecoder('euc-kr');
const files = fs.readdirSync('supabase').filter(f => f.endsWith('.csv'));

const complexPyeongs = {};

for (const f of files) {
  const buf = fs.readFileSync('supabase/' + f);
  const text = decoder.decode(buf);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headerIdx = lines.findIndex(l => l.includes('단지명'));
  if (headerIdx === -1) continue;
  const header = lines[headerIdx].split(',').map(s => s.replace(/"/g, '').trim());
  const nameIdx = header.indexOf('단지명');
  const areaIdx = header.indexOf('전용면적(㎡)');
  const priceIdx = header.indexOf('거래금액(만원)');

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    const parts = [];
    let match;
    while ((match = regex.exec(raw)) !== null) {
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      parts.push(val ? val.trim() : '');
      if (regex.lastIndex === 0) break;
    }
    if (parts.length < header.length) continue;

    const name = parts[nameIdx];
    const area = parseFloat(parts[areaIdx]);
    const priceStr = (parts[priceIdx] || '0').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    if (!name || isNaN(area)) continue;

    if (!complexPyeongs[name]) complexPyeongs[name] = new Map();

    // Classification of standard Korean apartment sizes based on exclusive area (전용면적)
    let pyeongId, pyeongName;
    if (area <= 62) {
      pyeongId = '24';
      pyeongName = '24평형 (전용 59㎡)';
    } else if (area <= 76) {
      pyeongId = '30';
      pyeongName = '30평형 (전용 74㎡)';
    } else if (area <= 86) {
      pyeongId = '34';
      pyeongName = '34평형 (전용 84㎡)';
    } else if (area <= 104) {
      pyeongId = '38';
      pyeongName = '38평형 (전용 99~101㎡)';
    } else {
      pyeongId = '45';
      pyeongName = '45평형 이상 (대형)';
    }

    const existing = complexPyeongs[name].get(pyeongId) || {
      id: pyeongId,
      name: pyeongName,
      count: 0,
      areas: new Set(),
      prices: [],
    };
    existing.count++;
    existing.areas.add(area.toFixed(1));
    if (price) existing.prices.push(price);
    complexPyeongs[name].set(pyeongId, existing);
  }
}

const samples = [
  '다산자이아이비플레이스',
  '힐스테이트다산',
  '다산자연앤e편한세상3차',
  '다산롯데캐슬',
  '다산한강반도유보라',
  '플루리움4,5단지',
  '다산유승한내들골든뷰',
  '다산푸르지오'
];

for (const name of samples) {
  console.log(`\n🏢 [${name}] 보유 평형 목록:`);
  const matchedKey = Object.keys(complexPyeongs).find(k => k.includes(name) || name.includes(k));
  if (!matchedKey) {
    console.log('  데이터 없음');
    continue;
  }
  const map = complexPyeongs[matchedKey];
  const sorted = Array.from(map.values()).sort((a, b) => parseInt(a.id) - parseInt(b.id));
  sorted.forEach(p => {
    const avg = Math.round(p.prices.reduce((a,b)=>a+b, 0) / (p.prices.length || 1));
    console.log(`  - ${p.id}평 (${p.name}): 거래 ${p.count}건, 평균가: ${avg.toLocaleString()}만 원 (실제 전용면적: ${Array.from(p.areas).join(', ')}㎡)`);
  });
}
