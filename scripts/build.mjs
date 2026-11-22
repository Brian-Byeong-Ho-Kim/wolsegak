// 월세각 데이터 빌드
// 국토교통부 전월세 실거래가 4종(단독/다가구, 연립다세대, 오피스텔, 아파트)을 전국 시군구 × 최근 12개월 받아
// public/data/sgg/{시군구코드}.json 과 public/data/index.json 을 만든다.
// 전년 동기 비교용으로 그 앞 12개월은 public/data/prev/{시군구코드}.json 에 둔다. 최근 12개월에서 밀려나는 달은
// API를 다시 부르지 않고 옮겨 담고, 비어 있는 달만 받는다(처음 한 번은 12개월치를 더 받음).
// 사용: DATA_GO_KR_KEY=발급받은일반인증키(Decoding) node scripts/build.mjs [--only=11110,11290] [--months=12]
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) { console.error('DATA_GO_KR_KEY 환경변수가 필요합니다'); process.exit(1); }
const arg = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const MONTHS = Math.min(24, Math.max(1, parseInt(arg.months || '12', 10)));
const MAX_AREA = 85; // ㎡ 이하만 (원룸~소형 위주)

const root = new URL('../', import.meta.url);
const read = async p => readFile(new URL(p, root), 'utf8');

// 유형 코드: 0 단독/다가구, 1 연립다세대, 2 오피스텔, 3 아파트
const TYPES = [
  { code: 0, svc: 'RTMSDataSvcSHRent', area: 'totalFloorAr', name: null },
  { code: 1, svc: 'RTMSDataSvcRHRent', area: 'excluUseAr', name: 'mhouseNm' },
  { code: 2, svc: 'RTMSDataSvcOffiRent', area: 'excluUseAr', name: 'offiNm' },
  { code: 3, svc: 'RTMSDataSvcAptRent', area: 'excluUseAr', name: 'aptNm' },
];

const leaf = (await read('data/sgg_leaf.tsv')).trim().split('\n').map(l => l.split('\t'));
const alias = JSON.parse(await read('data/sgg_alias.json'));
let targets = leaf;
if (arg.only) { const s = new Set(arg.only.split(',')); targets = leaf.filter(([c]) => s.has(c)); }

// 최근 MONTHS개월 (이번 달 포함, KST 기준)
const now = new Date(Date.now() + 9 * 36e5);
const ymOf = i => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const months = Array.from({ length: MONTHS }, (_, i) => ymOf(i));
// 전년 비교용: 그 앞 12개월 (arg.prev=0 이면 끔)
const PREV = arg.prev === '0' ? 0 : 12;
const prevMonths = Array.from({ length: PREV }, (_, i) => ymOf(MONTHS + i));
const rowYm = r => '20' + String(r[7]).padStart(6, '0').slice(0, 4);
const monthRange = (from, to) => { const out = []; if (!from || !to) return out; let y = +from.slice(0, 4), m = +from.slice(4); while (y * 100 + m <= +to) { out.push(`${y}${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].trim() : ''; };
const num = s => { const n = parseFloat(String(s || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
let calls = 0;

async function fetchMonth(svc, lawd, ym) {
  const items = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://apis.data.go.kr/1613000/${svc}/get${svc}?serviceKey=${encodeURIComponent(KEY)}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
    let xml = '';
    for (let tryN = 0; tryN < 4; tryN++) {
      try {
        calls++;
        const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
        xml = await r.text();
        if (r.ok && xml.includes('<response>')) break;
      } catch (e) { xml = String(e); }
      await sleep(1500 * (tryN + 1));
    }
    const code = tag(xml, 'resultCode');
    if (code && !/^0+$/.test(code)) throw new Error(`${svc} ${lawd} ${ym}: ${code} ${tag(xml, 'resultMsg')}`);
    if (!xml.includes('<response>')) throw new Error(`${svc} ${lawd} ${ym}: 응답 없음 ${xml.slice(0, 200)}`);
    const got = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    items.push(...got);
    const total = parseInt(tag(xml, 'totalCount') || '0', 10);
    if (items.length >= total || got.length === 0) break;
  }
  return items;
}

function shape(t, x, dongFilter) {
  const dong = tag(x, 'umdNm');
  if (dongFilter && !dongFilter.includes(dong.split(' ')[0])) return null;
  const area = num(tag(x, t.area));
  const dep = num(tag(x, 'deposit')), rent = num(tag(x, 'monthlyRent')) ?? 0;
  if (area == null || dep == null || area <= 0 || area > MAX_AREA) return null;
  const y = tag(x, 'dealYear'), m = tag(x, 'dealMonth').padStart(2, '0'), d = tag(x, 'dealDay').padStart(2, '0');
  const ct = tag(x, 'contractType'); // 신규 / 갱신 / 빈값
  return {
    dong,
    row: [t.code, 0, Math.round(area * 10) / 10, dep, rent, num(tag(x, 'floor')), num(tag(x, 'buildYear')),
      +(y.slice(2) + m + d), ct === '신규' ? 1 : ct === '갱신' ? 2 : 0],
  };
}

// 인증키가 아직 등록(활용신청 승인·동기화)되지 않은 API는 전국에서 건너뛴다
const skipped = new Set();
const notRegistered = e => /SERVICE_KEY_IS_NOT_REGISTERED|등록되지 않은 서비스키|SERVICE ACCESS DENIED/.test(String(e.message));

async function buildSgg([code, name], monthList = months) {
  const rows = [], dongs = [], dIdx = new Map(), perType = [0, 0, 0, 0];
  for (const t of TYPES) {
    if (skipped.has(t.svc)) continue;
    try { await typeRows(t); }
    catch (e) {
      if (!notRegistered(e)) throw e;
      if (!skipped.has(t.svc)) console.warn(`⚠ ${t.svc}: 인증키가 이 API에 등록되지 않아 건너뜀 (공공데이터포털 활용신청 확인)`);
      skipped.add(t.svc);
    }
  }
  async function typeRows(t) {
    for (const ym of monthList) {
      let items = await fetchMonth(t.svc, code, ym), filter = null;
      if (!items.length && alias[code]) {
        for (const [old, f] of alias[code]) {
          const got = await fetchMonth(t.svc, old, ym);
          for (const x of got) { const s = shape(t, x, f); if (s) push(s); }
        }
        continue;
      }
      for (const x of items) { const s = shape(t, x, filter); if (s) push(s); }
    }
  }
  function push({ dong, row }) {
    if (!dIdx.has(dong)) { dIdx.set(dong, dongs.length); dongs.push(dong); }
    row[1] = dIdx.get(dong);
    rows.push(row); perType[row[0]]++;
  }
  rows.sort((a, b) => b[7] - a[7]);
  return { code, name, dongs, rows, perType };
}

await mkdir(new URL('public/data/sgg/', root), { recursive: true });
await mkdir(new URL('public/data/prev/', root), { recursive: true });
async function readJson(p) { try { return JSON.parse(await read(p)); } catch { return null; } }

// 전년 동기 비교용 파일: 기존 prev 파일 + 이번에 12개월 창에서 밀려난 달(이전 sgg 파일) + 비어 있는 달만 새로 받기
async function buildPrev(s, old) {
  const code = s[0], want = new Set(prevMonths);
  const prev = await readJson(`public/data/prev/${code}.json`);
  const have = new Set(), keep = [];
  const take = (file, covered) => {
    if (!file) return;
    for (const m of covered) if (want.has(m)) have.add(m);
    for (const r of file.rows) if (want.has(rowYm(r))) keep.push([...r.slice(0, 1), file.dongs[r[1]], ...r.slice(2)]);
  };
  take(prev, prev?.months || []);
  if (old) { const cov = monthRange(old.from, old.to).filter(m => !have.has(m)); take({ ...old, rows: old.rows.filter(r => cov.includes(rowYm(r))) }, cov); }
  const missing = prevMonths.filter(m => !have.has(m));
  if (missing.length) {
    const got = await buildSgg(s, missing);
    for (const r of got.rows) keep.push([r[0], got.dongs[r[1]], ...r.slice(2)]);
    missing.forEach(m => have.add(m));
  }
  const dongs = [], dIdx = new Map();
  const rows = keep.map(r => { if (!dIdx.has(r[1])) { dIdx.set(r[1], dongs.length); dongs.push(r[1]); } return [r[0], dIdx.get(r[1]), ...r.slice(2)]; }).sort((a, b) => b[7] - a[7]);
  await writeFile(new URL(`public/data/prev/${code}.json`, root), JSON.stringify({
    v: 1, code, name: s[1], updated, from: prevMonths.at(-1), to: prevMonths[0], months: [...have].sort(),
    cols: ['type', 'dong', 'area', 'deposit', 'rent', 'floor', 'built', 'yymmdd', 'contract'], dongs, rows,
  }));
  if (missing.length) console.log(`  ${code} 전년 ${missing.length}개월 새로 받음`);
}
const updated = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
const index = [];
let failed = 0;
const queue = [...targets];
async function worker() {
  while (queue.length) {
    const s = queue.shift();
    try {
      const old = await readJson(`public/data/sgg/${s[0]}.json`);
      const r = await buildSgg(s);
      if (PREV) { try { await buildPrev(s, old); } catch (e) { console.warn(`전년 파일 실패 ${s[0]}: ${e.message}`); } }
      await writeFile(new URL(`public/data/sgg/${r.code}.json`, root), JSON.stringify({
        v: 1, code: r.code, name: r.name, updated, from: months.at(-1), to: months[0],
        cols: ['type', 'dong', 'area', 'deposit', 'rent', 'floor', 'built', 'yymmdd', 'contract'],
        dongs: r.dongs, rows: r.rows,
      }));
      // 전국 비교용: 원룸(단독·연립·오피스텔, ~23㎡) 보증금 2천↓ 신규 월세 중간값, 월세 비중
      const one = r.rows.filter(x => x[0] !== 3 && x[2] <= 23 && x[8] !== 2);
      const lowW = one.filter(x => x[4] > 0 && x[3] <= 2000).map(x => x[4]).sort((p, q) => p - q);
      const med = lowW.length ? lowW[Math.floor((lowW.length - 1) / 2)] : null;
      index.push({ code: r.code, name: r.name, n: r.rows.length, t: r.perType, m1: med, c1: lowW.length,
        ws: one.length ? Math.round(one.filter(x => x[4] > 0).length / one.length * 100) : null,
        d: [...new Set(r.dongs.map(x => x.split(' ')[0]))] });
      console.log(`${r.code} ${r.name}: ${r.rows.length}건 (누적 호출 ${calls})`);
    } catch (e) {
      failed++; console.error(`실패 ${s[0]} ${s[1]}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

// 대학 목록 → 시군구 매핑
const leafByName = new Map(leaf.map(([c, n]) => [n.trim(), c]));
const fixSido = a => a
  .replace(/^광주광역시 /, '전남광주통합특별시 ').replace(/^전라남도 /, '전남광주통합특별시 ')
  .replace(/^인천광역시 (동구|중구) /, '인천광역시 제물포구 ').replace(/^인천광역시 서구 /, '인천광역시 서해구 ');
function sggOf(addr) {
  const p = fixSido(addr).split(' ');
  for (const k of [3, 2, 1]) { const c = leafByName.get(p.slice(0, k).join(' ')); if (c) return c; }
  return null;
}
const univ = (await read('data/univ.tsv')).trim().split('\n').map(l => l.split('\t')).map(([name, campus, kind, addr]) => ({
  name, campus, kind, addr, sgg: sggOf(addr),
}));
const univAlias = JSON.parse(await read('data/univ_alias.json'));  // 약칭·영문 이름 (검색용)
const unmapped = univ.filter(u => !u.sgg);
if (unmapped.length) console.warn('시군구를 못 찾은 학교:', unmapped.map(u => u.name).join(', '));

// 기존 index와 합쳐서(부분 빌드 시) 저장
let prev = [];
try { prev = JSON.parse(await read('public/data/index.json')).sgg || []; } catch {}
const merged = new Map(prev.map(s => [s.code, s]));
for (const s of index) merged.set(s.code, s);
await writeFile(new URL('public/data/index.json', root), JSON.stringify({
  updated, from: months.at(-1), to: months[0], maxArea: MAX_AREA,
  src: '국토교통부 단독/다가구·연립다세대·오피스텔·아파트 전월세 실거래가 자료 (공공데이터포털)',
  sgg: [...merged.values()].sort((a, b) => a.code.localeCompare(b.code)),
  // 2026년 개편 지역의 동 목록 (지도에 옛 구 이름이 나올 때 동으로 찾기)
  split: Object.fromEntries(Object.entries(alias).filter(([, v]) => v[0] && v[0][1]).map(([k, v]) => [k, v[0][1]])),
  univ: univ.filter(u => u.sgg).map(({ name, campus, kind, addr, sgg }) => ({ name, campus, kind, addr, sgg, ...(univAlias[name] ? { a: univAlias[name] } : {}) })),
}));
console.log(`완료: 시군구 ${index.length}곳, 실패 ${failed}곳, API 호출 ${calls}회`);
if (failed && failed === targets.length) process.exit(1);
