// 방문 통계 API (Cloudflare Pages Functions + D1)
// 필요한 설정: Pages 프로젝트 → Settings → Bindings → D1 database, 변수 이름 STATS_DB
// 개인 정보는 저장하지 않는다: 날짜(한국 시간)·조회수·방문자 수·검증 횟수(지역 코드와 월세/전세)만 센다.
//   POST /api/visits {p, np, ns}            → 204  (방문: np 이 주소를 오늘 처음 봄, ns 오늘 첫 방문)
//   POST /api/visits {k:'check', l:'11110|wolse'} → 204  (매물 검증 1회)
//   POST /api/visits {k:'share', l:'native'|'copy'} → 204  (결과 공유 1회)
//   POST /api/visits {k:'ref', l:'search.naver.com'|'from:everytime'|'share'} → 204  (들어온 경로: 다른 사이트 주소의 호스트, ?from= 값, 공유 링크)
//   GET  /api/visits → 합계·일별·많이 본 주소·많이 검증한 지역
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const PATH = /^\/[A-Za-z0-9\-_.~%\/]{0,240}$/;
const SKIP = /^\/(api|stats|data)(\/|$)/;
const LABEL = /^[0-9]{5}\|(wolse|jeonse)$/;
const SHARE = /^(native|copy)$/;
const REF = /^(share|from:[a-z0-9_\-]{1,30}|[a-z0-9.\-]{1,80})$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor/i;
const kst = (offset = 0) => new Date(Date.now() + 9 * 3600e3 - offset * 86400e3).toISOString().slice(0, 10);

async function db(env) {
  const d = env.STATS_DB || env.LIKES_DB;
  if (!d) return null;
  await d.batch([
    d.prepare('CREATE TABLE IF NOT EXISTS wsg_visits (day TEXT NOT NULL, path TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, uniques INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, path))'),
    d.prepare('CREATE TABLE IF NOT EXISTS wsg_events (day TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, label))'),
  ]);
  return d;
}

export async function onRequestPost({ request, env }) {
  const d = await db(env);
  if (!d) return json({ error: 'not configured' }, 503);
  if (BOT.test(request.headers.get('user-agent') || '')) return new Response(null, { status: 204 });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const day = kst();
  if (body?.k === 'check') {
    const l = String(body.l || '');
    if (!LABEL.test(l)) return new Response(null, { status: 204 });
    await d.prepare("INSERT INTO wsg_events (day, kind, label, n) VALUES (?, 'check', ?, 1) ON CONFLICT(day, kind, label) DO UPDATE SET n = n + 1").bind(day, l).run();
    return new Response(null, { status: 204 });
  }
  if (body?.k === 'share' || body?.k === 'ref') {
    const l = String(body.l || '').toLowerCase();
    if (!(body.k === 'share' ? SHARE : REF).test(l)) return new Response(null, { status: 204 });
    await d.prepare("INSERT INTO wsg_events (day, kind, label, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, kind, label) DO UPDATE SET n = n + 1").bind(day, body.k, l).run();
    return new Response(null, { status: 204 });
  }
  let p = String(body?.p || '').split(/[?#]/)[0];
  if (!PATH.test(p) || SKIP.test(p)) return new Response(null, { status: 204 });
  const sql = 'INSERT INTO wsg_visits (day, path, views, uniques) VALUES (?, ?, 1, ?) ON CONFLICT(day, path) DO UPDATE SET views = views + 1, uniques = uniques + excluded.uniques';
  await d.batch([d.prepare(sql).bind(day, p, body?.np ? 1 : 0), d.prepare(sql).bind(day, '*', body?.ns ? 1 : 0)]);
  return new Response(null, { status: 204 });
}

export async function onRequestGet({ env }) {
  const d = await db(env);
  if (!d) return json({ error: 'not configured' }, 503);
  const sum = async (from, to) => {
    const r = await d.prepare("SELECT COALESCE(SUM(views),0) v, COALESCE(SUM(uniques),0) u FROM wsg_visits WHERE path = '*' AND day >= ? AND day <= ?").bind(from, to).first();
    return { views: r.v, uniques: r.u };
  };
  const chk = async (from, to) => (await d.prepare("SELECT COALESCE(SUM(n),0) n FROM wsg_events WHERE kind = 'check' AND day >= ? AND day <= ?").bind(from, to).first()).n;
  const from30 = kst(29), t = kst();
  const [today, yesterday, d7, d30, all] = await Promise.all([sum(t, t), sum(kst(1), kst(1)), sum(kst(6), t), sum(from30, t), sum('0000-00-00', '9999-99-99')]);
  const [cToday, c7, c30, cAll] = await Promise.all([chk(t, t), chk(kst(6), t), chk(from30, t), chk('0000-00-00', '9999-99-99')]);
  const { results: daily } = await d.prepare("SELECT day, views, uniques FROM wsg_visits WHERE path = '*' AND day >= ? ORDER BY day").bind(from30).all();
  const { results: checksDaily } = await d.prepare("SELECT day, SUM(n) n FROM wsg_events WHERE kind = 'check' AND day >= ? GROUP BY day ORDER BY day").bind(from30).all();
  const { results: topPlaces } = await d.prepare("SELECT label, SUM(n) n FROM wsg_events WHERE kind = 'check' AND day >= ? GROUP BY label ORDER BY n DESC LIMIT 20").bind(from30).all();
  const ev = async (kind, from, to) => (await d.prepare("SELECT COALESCE(SUM(n),0) n FROM wsg_events WHERE kind = ? AND day >= ? AND day <= ?").bind(kind, from, to).first()).n;
  const [sToday, s7, s30, sAll] = await Promise.all([ev('share', t, t), ev('share', kst(6), t), ev('share', from30, t), ev('share', '0000-00-00', '9999-99-99')]);
  const { results: topRefs } = await d.prepare("SELECT label, SUM(n) n FROM wsg_events WHERE kind = 'ref' AND day >= ? GROUP BY label ORDER BY n DESC LIMIT 20").bind(from30).all();
  return json({ today, yesterday, d7, d30, all, checks: { today: cToday, d7: c7, d30: c30, all: cAll }, shares: { today: sToday, d7: s7, d30: s30, all: sAll }, daily, checksDaily, topPlaces, topRefs, today_day: t });
}
