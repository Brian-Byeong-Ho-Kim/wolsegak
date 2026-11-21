// 이미 받아 둔 public/data/sgg/*.json 으로 index.json의 요약 통계(전국 비교용)와 개편 지역 동 목록을 다시 계산한다.
// API를 호출하지 않는다. 사용: node scripts/summarize.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const idxUrl = new URL('public/data/index.json', root);
const index = JSON.parse(await readFile(idxUrl, 'utf8'));
const alias = JSON.parse(await readFile(new URL('data/sgg_alias.json', root), 'utf8'));
const files = (await readdir(new URL('public/data/sgg/', root))).filter(f => f.endsWith('.json'));

const byCode = new Map(index.sgg.map(s => [s.code, s]));
for (const f of files) {
  const d = JSON.parse(await readFile(new URL(`public/data/sgg/${f}`, root), 'utf8'));
  const perType = [0, 0, 0, 0];
  for (const r of d.rows) perType[r[0]]++;
  const one = d.rows.filter(x => x[0] !== 3 && x[2] <= 23 && x[8] !== 2);
  const lowW = one.filter(x => x[4] > 0 && x[3] <= 2000).map(x => x[4]).sort((p, q) => p - q);
  byCode.set(d.code, {
    ...(byCode.get(d.code) || {}), code: d.code, name: d.name, n: d.rows.length, t: perType,
    m1: lowW.length ? lowW[Math.floor((lowW.length - 1) / 2)] : null, c1: lowW.length,
    ws: one.length ? Math.round(one.filter(x => x[4] > 0).length / one.length * 100) : null,
    d: [...new Set(d.dongs.map(x => x.split(' ')[0]))],
  });
}
index.sgg = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
index.split = Object.fromEntries(Object.entries(alias).filter(([, v]) => v[0] && v[0][1]).map(([k, v]) => [k, v[0][1]]));
await writeFile(idxUrl, JSON.stringify(index));
console.log(`요약 갱신: 시군구 ${index.sgg.length}곳, 전국 비교 가능 ${index.sgg.filter(s => s.c1 >= 30).length}곳`);
