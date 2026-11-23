// 학교별 월세 시세 페이지(public/u/…)와 sitemap.xml을 만든다. API를 호출하지 않는다.
// 이미 받아 둔 public/data/index.json, public/data/sgg/*.json 만 읽는다.
// 사용: node scripts/pages.mjs   (build.mjs 다음에 실행)
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const SITE = 'https://www.wolsegak.com';
const root = new URL('../', import.meta.url);
const pub = new URL('public/', root);
const index = JSON.parse(await readFile(new URL('data/index.json', pub), 'utf8'));
// 브라우저 캐시가 예전 css/js를 붙들지 않도록, 파일 내용 해시를 주소에 붙인다
const hashOf = async f => createHash('md5').update(await readFile(new URL(f, root))).digest('hex').slice(0, 8);
const ASSET_V = { css: await hashOf('scripts/u.css'), js: await hashOf('scripts/umap.js'), sj: await hashOf('scripts/smap.js') };
const GEO = JSON.parse(await readFile(new URL('data/univ_geo.json', pub), 'utf8'));
const TYPE_NAMES = ['원룸·다가구', '빌라', '오피스텔', '아파트'];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n == null || !isFinite(n) ? '-' : Math.round(n).toLocaleString('ko-KR');
const won = m => { m = Math.round(m); if (Math.abs(m) >= 10000) { const e = Math.floor(m / 10000), r = m % 10000; return `${e}억${r ? ' ' + r.toLocaleString('ko-KR') : ''}만원`; } return `${m.toLocaleString('ko-KR')}만원`; };
const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) / 2; return (s[Math.floor(i)] + s[Math.ceil(i)]) / 2; };
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const ym = s => `20${s.slice(0, 2)}.${s.slice(2, 4)}`;
const lastYear = k => String(+k.slice(0, 2) - 1).padStart(2, '0') + k.slice(2);
const yoyText = y => { const d = y.now - y.last, p = d / y.last * 100; return `작년 같은 기간(${y.lab})보다 ${d === 0 ? '그대로' : `${fmt(Math.abs(d))}만원(${Math.abs(p).toFixed(1)}%) ${d > 0 ? '올랐어요' : '내렸어요'}`}`; };
const period = `${index.from.slice(0, 4)}.${index.from.slice(4)}~${index.to.slice(0, 4)}.${index.to.slice(4)}`;
const sggName = c => index.sgg.find(s => s.code === c)?.name || c;
const shortSgg = n => n.split(' ').slice(1).join(' ') || n;

export const slugOf = u => {
  let s = u.name.replace(/\s+/g, '').replace(/[()（）]/g, m => /[(（]/.test(m) ? '-' : '').replace(/[\/?#%]/g, '');
  if (u.campus !== '본교' && !/[(（]/.test(u.name)) s += '-' + u.campus;
  return s.replace(/-+$/, '');
};

// ---- 전국 순위 (원룸형 중간 월세, 거래 30건 이상 시군구) ----
const ranked = index.sgg.filter(s => s.c1 >= 30 && s.m1 != null).sort((a, b) => b.m1 - a.m1);
const rankOf = c => { const i = ranked.findIndex(s => s.code === c); return i < 0 ? null : i + 1; };

// ---- 시군구별 통계 ----
const statCache = new Map();
async function stats(code) {
  if (statCache.has(code)) return statCache.get(code);
  const d = JSON.parse(await readFile(new URL(`data/sgg/${code}.json`, pub), 'utf8'));
  const R = d.rows.filter(r => r[8] !== 2);                                   // 갱신 계약 제외
  const w = R.filter(r => r[0] !== 3 && r[2] <= 23 && r[4] > 0 && r[3] <= 2000); // 원룸형 월세 (보증금 2천↓)
  const months = {};
  for (const r of w) { const k = String(r[7]).padStart(6, '0').slice(0, 4); (months[k] ||= []).push(r[4]); }
  const mo = Object.keys(months).sort().map(k => ({ k, n: months[k].length, m: med(months[k]) }));
  const byType = [0, 1, 2].map(t => { const a = w.filter(r => r[0] === t).map(r => r[4]); return { t, n: a.length, m: med(a) }; });
  const bands = [[0, 23, '23㎡ 이하 (원룸, ~7평)'], [23, 33, '23~33㎡ (1.5룸, ~10평)'], [33, 50, '33~50㎡ (투룸, ~15평)'], [50, 85, '50~85㎡ (쓰리룸)']];
  const byArea = bands.map(([lo, hi, l]) => { const a = R.filter(r => r[0] !== 3 && r[2] > lo && r[2] <= hi && r[4] > 0 && r[3] <= (hi <= 23 ? 2000 : 5000)).map(r => r[4]); return { l, n: a.length, m: med(a), dep: hi <= 23 ? 2000 : 5000 }; });
  const dmap = new Map();
  for (const r of w) { const k = d.dongs[r[1]]; if (!dmap.has(k)) dmap.set(k, []); dmap.get(k).push(r[4]); }
  const dongs = [...dmap].filter(([, a]) => a.length >= 5).map(([k, a]) => ({ k, n: a.length, m: med(a) })).sort((a, b) => b.n - a.n).slice(0, 12);
  const jeon = R.filter(r => r[0] !== 3 && r[2] <= 33 && r[4] === 0).map(r => r[3]);
  // 전년 동기 (public/data/prev/ 가 있을 때): 이번 달은 신고가 덜 들어와 빼고 직전 3개월끼리 비교
  let yoy = null;
  try {
    const pv = JSON.parse(await readFile(new URL(`data/prev/${code}.json`, pub), 'utf8'));
    const pw = pv.rows.filter(r => r[8] !== 2 && r[0] !== 3 && r[2] <= 23 && r[4] > 0 && r[3] <= 2000);
    const pmon = {};
    for (const r of pw) { const k = String(r[7]).padStart(6, '0').slice(0, 4); (pmon[k] ||= []).push(r[4]); }
    for (const m of mo) { const a = pmon[lastYear(m.k)] || []; m.pn = a.length; m.pm = a.length >= 3 ? med(a) : null; }
    const win = mo.slice(-4, -1).map(m => m.k);
    const a = w.filter(r => win.includes(String(r[7]).padStart(6, '0').slice(0, 4))).map(r => r[4]);
    const b = pw.filter(r => win.map(lastYear).includes(String(r[7]).padStart(6, '0').slice(0, 4))).map(r => r[4]);
    if (win.length === 3 && a.length >= 10 && b.length >= 10) yoy = { lab: `${+win[0].slice(2)}~${+win[2].slice(2)}월`, now: med(a), last: med(b), na: a.length, nb: b.length };
  } catch {}
  const s = {
    code, name: d.name, total: d.rows.length, n: w.length,
    m: med(w.map(r => r[4])), p25: q(w.map(r => r[4]), .25), p75: q(w.map(r => r[4]), .75),
    dep: med(w.map(r => r[3])), mo, byType, byArea, dongs,
    jn: jeon.length, jm: med(jeon), rank: rankOf(code), yoy,
  };
  statCache.set(code, s);
  return s;
}

// ---- 공통 조각 ----
const head = ({ title, desc, path, extra = '' }) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="월세각">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og/default.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/u/u.css?v=${ASSET_V.css}">
<script src="/visit.js" defer></script>
${extra}
</head>
<body>
<div class="wrap">
<header><a class="home" href="/"><span class="logo"><svg width="22" height="22" viewBox="0 0 64 64"><path d="M10 32 32 13l22 19v19a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#fff"/><path d="m22 37 7 7 13-14" stroke="#ff6b3d" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span><b>월세각</b><small>이 월세, 각 나오나?</small></span></a><nav class="topr"><a class="tb" href="/">🏠 홈</a><a class="tb" id="loginTb" href="/api/auth/kakao">로그인</a></nav></header>
<script>
(function(){var a=document.getElementById('loginTb');if(!a)return;
a.href='/api/auth/kakao?next='+encodeURIComponent(location.pathname);
fetch('/api/me',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){if(j&&j.user){a.textContent='마이페이지';a.href='/me/'}}).catch(function(){});})();
</script>`;

const foot = `<footer>
<div>데이터: 국토교통부 전월세 실거래가 자료(단독/다가구·연립다세대·오피스텔·아파트), 한국대학교육협의회 전국대학및전문대학정보표준데이터 (공공데이터포털). 최근 12개월(${period}), 전용 85㎡ 이하, 갱신 계약 제외. ${esc(index.updated)} 갱신.</div>
<div>실거래 신고에는 관리비가 없어요. 같은 건물이라도 층·방향·옵션에 따라 가격이 달라요. 월세각은 공공데이터로 만든 참고 서비스이며, 법률·금융 자문이 아닙니다.</div>
<div style="margin-top:10px;font-weight:600;color:var(--ink)">© 2026 이티컴퍼니</div>
</footer>
</div>
</body>
</html>
`;

function trendSvg(mo) {
  const pts = mo.filter(m => m.m != null && m.n >= 3);
  if (pts.length < 3) return '';
  const W = 640, H = 200, P = 34, bw = (W - P * 2) / mo.length;
  const pv = mo.filter(m => m.pm != null && m.pn >= 3).map(m => m.pm);
  const vals = pts.map(m => m.m), all = vals.concat(pv), lo = Math.min(...all) * 0.9, hi = Math.max(...all) * 1.1;
  const maxN = Math.max(...mo.map(m => m.n));
  const x = i => P + bw * i + bw / 2, y = v => H - 26 - (v - lo) / ((hi - lo) || 1) * (H - 56);
  const line = mo.map((m, i) => m.m != null && m.n >= 3 ? `${x(i).toFixed(1)},${y(m.m).toFixed(1)}` : null).filter(Boolean);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="월별 원룸 중간 월세">
${mo.map((m, i) => `<rect x="${(P + bw * i + 3).toFixed(1)}" y="${(H - 26 - m.n / maxN * (H - 70)).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${(m.n / maxN * (H - 70)).toFixed(1)}" rx="3" fill="#fed7aa"><title>${ym(m.k)} 거래 ${m.n}건</title></rect>`).join('')}
${pv.length > 1 ? `<polyline points="${mo.map((m, i) => m.pm != null && m.pn >= 3 ? `${x(i).toFixed(1)},${y(m.pm).toFixed(1)}` : null).filter(Boolean).join(' ')}" fill="none" stroke="#a8a29e" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round"/>` : ''}
${mo.map((m, i) => m.pm != null && m.pn >= 3 ? `<circle cx="${x(i).toFixed(1)}" cy="${y(m.pm).toFixed(1)}" r="3" fill="#a8a29e"><title>작년 ${ym(lastYear(m.k))} 중간 월세 ${fmt(m.pm)}만원</title></circle>` : '').join('')}
<polyline points="${line.join(' ')}" fill="none" stroke="#c2410c" stroke-width="3" stroke-linejoin="round"/>
${mo.map((m, i) => m.m != null && m.n >= 3 ? `<circle cx="${x(i).toFixed(1)}" cy="${y(m.m).toFixed(1)}" r="4" fill="#c2410c"><title>${ym(m.k)} 중간 월세 ${fmt(m.m)}만원</title></circle>` : '').join('')}
${mo.map((m, i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="13" fill="#6d635c" text-anchor="middle">${+m.k.slice(2)}월</text>`).join('')}
<text x="${P - 6}" y="${(y(Math.max(...vals)) + 5).toFixed(1)}" font-size="13" fill="#c2410c" text-anchor="end">${fmt(Math.max(...vals))}</text>
<text x="${P - 6}" y="${(y(Math.min(...vals)) + 5).toFixed(1)}" font-size="13" fill="#c2410c" text-anchor="end">${fmt(Math.min(...vals))}</text>
</svg>
<div class="legend"><span><i style="background:#fed7aa"></i>거래 건수</span><span><i style="background:#c2410c"></i>중간 월세(만원)</span>${pv.length > 1 ? '<span><i style="background:#a8a29e"></i>작년 같은 달</span>' : ''}<span>최근 달은 신고가 덜 들어와 적게 보여요</span></div>`;
}

const bar = (v, max) => `<span class="bar"><i style="width:${Math.max(4, Math.round(v / max * 100))}%"></i></span>`;

// ---- 학교 페이지 ----
async function univPage(u, all) {
  const s = await stats(u.sgg);
  const slug = slugOf(u), path = `/u/${encodeURIComponent(slug)}/`;
  const place = shortSgg(s.name);
  const full = u.name + (u.campus !== '본교' && !/[(（]/.test(u.name) ? ` ${u.campus}` : '');
  const aka = (u.a || []).slice(0, 2).join('·');            // 예: KAIST·카이스트
  const fullT = aka ? (/[()]/.test(full) ? `${full} · ${aka}` : `${full}(${aka})`) : full;
  const enough = s.n >= 15;
  const title = enough ? `${fullT} 자취방 월세 시세 — 원룸 중간 월세 ${fmt(s.m)}만원 | 월세각` : `${fullT} 자취방 월세 시세 | 월세각`;
  const desc = enough
    ? `${fullT} 근처(${place}) 원룸 실거래 ${s.n.toLocaleString()}건 기준 보증금 2천만원 이하 중간 월세 ${fmt(s.m)}만원, 보통 ${fmt(s.p25)}~${fmt(s.p75)}만원. 국토교통부 실거래가로 본 동네별·크기별 시세와 계약 전 확인사항.`
    : `${full} 근처(${place}) 전월세 실거래 시세. 국토교통부 실거래가로 같은 동네 비슷한 집과 보증금·월세를 비교해 보세요.`;
  const hash = new URLSearchParams({ u: u.name, s: u.sgg }).toString();
  const same = all.filter(x => x.sgg === u.sgg && x !== u).slice(0, 12);
  const maxD = Math.max(1, ...s.dongs.map(d => d.m || 0));
  const typeRows = s.byType.filter(t => t.n >= 5);
  const areaRows = s.byArea.filter(a => a.n >= 5);
  const faq = enough ? [
    [`${full} 근처 원룸 월세는 보통 얼마예요?`, `${place}에서 최근 12개월 신고된 원룸형(전용 23㎡ 이하) 월세 계약 중 보증금 2천만원 이하 ${s.n.toLocaleString()}건의 중간 월세는 ${fmt(s.m)}만원이고, 절반이 ${fmt(s.p25)}~${fmt(s.p75)}만원 사이였어요. 중간 보증금은 ${won(s.dep)}이에요.`],
    [`${place} 월세는 전국에서 비싼 편인가요?`, s.rank ? `원룸 월세 거래가 30건 이상인 전국 ${ranked.length}개 시군구 중 ${s.rank}번째로 비싸요.` : '거래가 적어 전국 순위는 내지 않았어요.'],
    ...(s.yoy ? [[`${place} 원룸 월세, 작년보다 올랐나요?`, `${yoyText(s.yoy)}. 작년 ${s.yoy.lab} 중간 월세 ${fmt(s.yoy.last)}만원(${s.yoy.nb}건), 올해 같은 기간 ${fmt(s.yoy.now)}만원(${s.yoy.na}건) 기준이에요.`]] : []),
    ['관리비도 포함된 가격인가요?', '아니요. 실거래 신고에는 관리비가 없어서 월세만 비교해요. 관리비가 큰 집은 실제 부담이 더 커요.'],
  ] : [];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '월세각', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: '학교별 월세 시세', item: SITE + '/u/' },
      { '@type': 'ListItem', position: 3, name: full, item: SITE + path }] },
    ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([qq, a]) => ({ '@type': 'Question', name: qq, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
  ];
  const html = head({ title, desc, path, extra: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` }).replace('<div class="wrap">', '<div class="wrap split">') + `
<div id="umapWrap" data-name="${esc(u.name)}" data-s="${esc(u.sgg)}" data-addr="${esc(u.addr)}"${GEO[u.name + '|' + u.campus] ? ` data-lat="${GEO[u.name + '|' + u.campus][0]}" data-lng="${GEO[u.name + '|' + u.campus][1]}"` : ''}><div id="umap" role="application" aria-label="${esc(u.name)} 주변 실거래 지도"></div><p class="hint" id="umapHint">🎓 학교 주변 최근 3개월 실거래예요. 숫자를 누르면 건물별 거래가 보여요.</p><script src="/u/smap.js?v=${ASSET_V.sj}" defer></script></div>
<nav class="crumb"><a href="/">월세각</a> › <a href="/u/">학교별 월세 시세</a> › ${esc(full)}</nav>
<h1>${esc(full)} 자취방 월세 시세</h1>${aka ? `\n<p class="aka">${esc((u.a || []).join(' · '))}</p>` : ''}
<p class="lead">${esc(u.addr)} · <b>${esc(s.name)}</b> 실거래 기준 · ${period}</p>
${enough ? `
<section class="hero">
  <div class="lab">원룸형 중간 월세 <small>(전용 23㎡ 이하, 보증금 2천만원 이하)</small></div>
  <div class="big">${fmt(s.m)}<small>만원</small></div>
  <div class="desc">절반이 <b>${fmt(s.p25)}~${fmt(s.p75)}만원</b> 사이 · 중간 보증금 ${won(s.dep)} · 거래 ${s.n.toLocaleString()}건${s.rank ? ` · 전국 ${ranked.length}개 시군구 중 <b>${s.rank}번째로 비쌈</b>` : ''}</div>
  ${s.yoy ? `<div class="yoy">${s.yoy.now > s.yoy.last ? '▲' : s.yoy.now < s.yoy.last ? '▼' : '='} ${esc(yoyText(s.yoy))} <small>(작년 ${fmt(s.yoy.last)} → 올해 ${fmt(s.yoy.now)}만원)</small></div>` : ''}
</section>
<a class="cta" href="/#${esc(hash)}">🔍 내가 본 방, ${esc(place)} 실거래와 비교하기</a>
<p class="hint">보증금·월세·면적을 넣으면 같은 동·같은 종류·비슷한 크기의 실제 계약 사이에서 몇 % 위치인지 알려 드려요.</p>
<section class="card"><h2>📈 월별 중간 월세</h2>${trendSvg(s.mo)}</section>
${typeRows.length ? `<section class="card"><h2>🏠 집 종류별 <small>· 원룸형, 보증금 2천↓</small></h2><table><tr><th>종류</th><th>중간 월세</th><th>거래</th></tr>${typeRows.map(t => `<tr><td>${TYPE_NAMES[t.t]}</td><td><b>${fmt(t.m)}만원</b></td><td>${t.n.toLocaleString()}건</td></tr>`).join('')}</table></section>` : ''}
${areaRows.length ? `<section class="card"><h2>📐 크기별 <small>· 아파트 제외</small></h2><table><tr><th>크기</th><th>중간 월세</th><th>거래</th></tr>${areaRows.map(a => `<tr><td>${a.l}<br><small>보증금 ${won(a.dep)} 이하</small></td><td><b>${fmt(a.m)}만원</b></td><td>${a.n.toLocaleString()}건</td></tr>`).join('')}</table></section>` : ''}
${s.dongs.length >= 2 ? `<section class="card"><h2>📍 동네별 원룸 중간 월세 <small>· 거래 많은 순</small></h2><table><tr><th>동</th><th>중간 월세</th><th></th><th>거래</th></tr>${s.dongs.map(d => `<tr><td>${esc(d.k)}</td><td><b>${fmt(d.m)}만원</b></td><td>${bar(d.m, maxD)}</td><td>${d.n}건</td></tr>`).join('')}</table></section>` : ''}
${s.jn >= 10 ? `<section class="card"><h2>🔑 전세는? <small>· 전용 33㎡ 이하, 아파트 제외</small></h2><p>중간 전세 보증금 <b>${won(s.jm)}</b> (${s.jn.toLocaleString()}건). 전세는 가격보다 <b>안전한지</b>가 더 중요해요. 등기부등본·전세보증보험 가입 가능 여부를 꼭 확인하세요.</p></section>` : ''}
<section class="card"><h2>❓ 자주 묻는 질문</h2>${faq.map(([qq, a]) => `<h3>${esc(qq)}</h3><p>${esc(a)}</p>`).join('')}</section>
` : `
<section class="card"><p>${esc(place)}는 최근 12개월 원룸형 월세 신고가 ${s.n}건으로 적어서 요약 통계를 내지 않았어요. 전체 전월세 거래는 ${s.total.toLocaleString()}건 있어요. 아래에서 집 종류·크기를 넓혀 직접 비교해 보세요.</p></section>
<a class="cta" href="/#${esc(hash)}">🔍 ${esc(place)} 실거래로 비교하기</a>`}
<section class="card"><h2>✅ 계약 전에 꼭 확인하세요</h2><ul>
<li><b>너무 싼 방은 미끼매물</b>일 수 있어요. 방문 전에 매물 번호를 대고 "지금 볼 수 있나요?" 확인하세요.</li>
<li><b>등기부등본</b>(인터넷등기소)으로 주소·소유자·근저당을 확인하세요.</li>
<li><b>관리비</b>에 무엇이 포함됐는지 세부 내역을 받아 두세요.</li>
<li>이사 당일 <b>전입신고·확정일자</b>를 받아 두세요.</li>
</ul></section>
${same.length ? `<section class="card"><h2>🎓 ${esc(place)}의 다른 학교</h2><div class="links">${same.map(x => `<a href="/u/${encodeURIComponent(slugOf(x))}/">${esc(x.name)}${x.campus !== '본교' && !/[(（]/.test(x.name) ? ' ' + esc(x.campus) : ''}</a>`).join('')}</div></section>` : ''}
<p class="more"><a href="/u/">전국 학교별 월세 시세 보기 →</a></p>
` + foot;
  await mkdir(new URL(`u/${slug}/`, pub), { recursive: true });
  await writeFile(new URL(`u/${slug}/index.html`, pub), html);
  return { path, full, u, s };
}

// ---- 실행 ----
await rm(new URL('u/', pub), { recursive: true, force: true });
await mkdir(new URL('u/', pub), { recursive: true });
const cssSrc = await readFile(new URL('scripts/u.css', root)), jsSrc = await readFile(new URL('scripts/umap.js', root));
await writeFile(new URL('u/u.css', pub), cssSrc);
await writeFile(new URL('u/map.js', pub), jsSrc);
await writeFile(new URL('u/smap.js', pub), await readFile(new URL('scripts/smap.js', root)));
const univs = [...index.univ].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const seen = new Set();
for (const u of univs) { const s = slugOf(u); if (seen.has(s)) throw new Error('중복 주소: ' + s); seen.add(s); }
const pages = [];
for (const u of univs) pages.push(await univPage(u, univs));
// 첫 화면 지도의 점 색(학교별 원룸 중간 월세, 거래 15건 이상만)
await writeFile(new URL('data/univ_m.json', pub), JSON.stringify(Object.fromEntries(pages.filter(p => p.s.n >= 15).map(p => [p.u.name + '|' + p.u.campus, Math.round(p.s.m)]))));

// 목록 페이지
const bySido = new Map();
for (const p of pages) { const k = sggName(p.u.sgg).split(' ')[0]; if (!bySido.has(k)) bySido.set(k, []); bySido.get(k).push(p); }
const sidoOrder = [...bySido.keys()].sort((a, b) => bySido.get(b).length - bySido.get(a).length);
const top = ranked.slice(0, 10), low = ranked.slice(-10).reverse();
const listHtml = head({
  title: '전국 대학가 자취방 월세 시세 — 학교별 원룸 중간 월세 | 월세각',
  desc: `전국 대학·전문대 ${pages.length}곳 근처 원룸 월세 시세. 국토교통부 전월세 실거래가(${period})로 본 학교별 중간 월세와 전국 비싼 곳·싼 곳 순위.`,
  path: '/u/',
}).replace('<div class="wrap">', '<div class="wrap split">') + `
<nav class="crumb"><a href="/">월세각</a> › 학교별 월세 시세</nav>
<h1>전국 대학가 자취방 월세 시세</h1>
<p class="lead">학교를 고르면 그 학교가 있는 시군구의 원룸 실거래 시세를 볼 수 있어요. ${period} 국토교통부 실거래가 기준.</p>
<input id="f" class="find" placeholder="학교 이름 검색 (예: 성균관대)" autocomplete="off">
<div id="umapWrap"><div id="umap" role="application" aria-label="전국 대학 지도"></div>
<div class="legend ulegend"><span><i style="background:#16a34a"></i>35만 미만</span><span><i style="background:#2563eb"></i>35~45만</span><span><i style="background:#d97706"></i>45~55만</span><span><i style="background:#dc2626"></i>55만 이상</span><span><i style="background:#78716c"></i>거래 적음</span></div>
<p class="hint" id="umapHint">지도의 동그라미를 누르면 학교 정보가 뜨고, 아래 목록에 마우스를 올리면 지도가 그 학교로 이동해요. 동그라미 색은 원룸 중간 월세예요.</p></div>
<div class="two">
<section class="card"><h2>💸 원룸 월세 비싼 곳 TOP 10</h2><table>${top.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td><b>${fmt(s.m1)}만원</b></td></tr>`).join('')}</table></section>
<section class="card"><h2>🪙 원룸 월세 싼 곳 TOP 10</h2><table>${low.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td><b>${fmt(s.m1)}만원</b></td></tr>`).join('')}</table></section>
</div>
<p class="hint">원룸형(전용 23㎡ 이하, 아파트 제외), 보증금 2천만원 이하 신규 월세 계약의 중간 월세. 거래 30건 이상인 ${ranked.length}개 시군구 비교.</p>
${sidoOrder.map(k => `<section class="card sido"><h2>${esc(k)} <small>${bySido.get(k).length}곳</small></h2><div class="links">${bySido.get(k).map(p => `<a href="${p.path}" data-n="${esc([p.full, ...(p.u.a || [])].join(' '))}" data-k="${esc(p.u.name + '|' + p.u.campus)}" data-s="${esc(p.u.sgg)}" data-addr="${esc(p.u.addr)}"${p.s.n >= 15 ? ` data-m="${Math.round(p.s.m)}"` : ''}>${esc(p.full)}${p.s.n >= 15 ? ` <small>${fmt(p.s.m)}만</small>` : ''}</a>`).join('')}</div></section>`).join('')}
<script src="/u/map.js?v=${ASSET_V.js}" defer></script>
<script>
document.getElementById('f').addEventListener('input', e => {
  const nz = t => t.replace(/\\s/g, '').replace(/대학교|대학/g, '대').toLowerCase();
  const v = nz(e.target.value);
  document.querySelectorAll('.sido').forEach(sec => {
    let any = false;
    sec.querySelectorAll('a').forEach(a => { const ok = !v || nz(a.dataset.n).includes(v); a.style.display = ok ? '' : 'none'; any = any || ok; });
    sec.style.display = any ? '' : 'none';
  });
});
</script>
` + foot;
await writeFile(new URL('u/index.html', pub), listHtml);

// sitemap
const today = index.updated;
const urls = [['/', '1.0', 'weekly'], ['/u/', '0.9', 'weekly'], ...pages.map(p => [p.path, '0.7', 'weekly'])];
await writeFile(new URL('sitemap.xml', pub), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, pr, cf]) => `<url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);
console.log(`학교 페이지 ${pages.length}곳, 요약 있는 곳 ${pages.filter(p => p.s.n >= 15).length}곳, sitemap ${urls.length}개 주소`);
