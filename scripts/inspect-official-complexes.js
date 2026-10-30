const fs = require('fs');
const decoder = new TextDecoder('euc-kr');
const files = fs.readdirSync('supabase').filter(f => f.endsWith('.csv'));
const counts = {};

for (const f of files) {
  const buf = fs.readFileSync('supabase/' + f);
  const text = decoder.decode(buf);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headerIdx = lines.findIndex(l => l.includes('단지명'));
  if (headerIdx === -1) continue;
  const header = lines[headerIdx].split(',').map(s => s.replace(/"/g, '').trim());
  const nameIdx = header.indexOf('단지명');
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
    const name = parts[nameIdx];
    if (name) counts[name] = (counts[name] || 0) + 1;
  }
}

const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
console.log('Total official complexes:', sorted.length);
sorted.forEach(([name, c], i) => {
  console.log(`${i+1}. ${name} (${c}건)`);
});
