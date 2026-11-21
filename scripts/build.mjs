// 월세각 데이터 빌드
// 국토교통부 전월세 실거래가 4종(단독/다가구, 연립다세대, 오피스텔, 아파트)을 전국 시군구 × 최근 12개월 받아
// public/data/sgg/{시군구코드}.json 과 public/data/index.json 을 만든다.
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
const months = [];
for (let i = 0; i < MONTHS; i++) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
  months.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
}

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
  if (dongFilter && !dongFilter.includes(dong)) return null;
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

async function buildSgg([code, name]) {
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
    for (const ym of months) {
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
const updated = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
const index = [];
let failed = 0;
const queue = [...targets];
async function worker() {
  while (queue.length) {
    const s = queue.shift();
    try {
      const r = await buildSgg(s);
      await writeFile(new URL(`public/data/sgg/${r.code}.json`, root), JSON.stringify({
        v: 1, code: r.code, name: r.name, updated, from: months.at(-1), to: months[0],
        cols: ['type', 'dong', 'area', 'deposit', 'rent', 'floor', 'built', 'yymmdd', 'contract'],
        dongs: r.dongs, rows: r.rows,
      }));
      index.push({ code: r.code, name: r.name, n: r.rows.length, t: r.perType });
      console.log(`${r.code} ${r.name}: ${r.rows.length}건 (누적 호출 ${calls})`);
    } catch (e) {
      failed++; console.error(`실패 ${s[0]} ${s[1]}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

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
  univ: univ.filter(u => u.sgg).map(({ name, campus, kind, addr, sgg }) => ({ name, campus, kind, addr, sgg })),
}));
console.log(`완료: 시군구 ${index.length}곳, 실패 ${failed}곳, API 호출 ${calls}회`);
if (failed && failed === targets.length) process.exit(1);
