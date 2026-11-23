// 내 저장 데이터 (관심 지역·비교한 방·예산)
//   GET /api/saved → {data}
//   PUT /api/saved {data} → 저장 (최대 64KB)
import { json, db, currentUser, sameOrigin } from '../../lib/auth.js';

const AREAS = ['0-23', '23-36', '36-60', '60-85'];
const cleanPrefs = x => {
  const o = x && typeof x === 'object' ? x : {};
  return {
    nick: typeof o.nick === 'string' ? o.nick.replace(/[<>]/g, '').trim().slice(0, 20) : '',
    view: o.view === 'budget' ? 'budget' : 'check',
    types: Array.isArray(o.types) ? [...new Set(o.types.map(Number).filter(t => t >= 0 && t <= 3))] : [],
    areas: Array.isArray(o.areas) ? [...new Set(o.areas.filter(a => AREAS.includes(a)))] : [],
    home: typeof o.home === 'string' ? o.home.slice(0, 200) : '',
    school: typeof o.school === 'string' ? o.school.replace(/[<>]/g, '').trim().slice(0, 60) : '',   // 내 학교 (이름)
    region: typeof o.region === 'string' ? o.region.replace(/[<>]/g, '').trim().slice(0, 60) : '',   // 내 지역 (검색어)
    fee: Math.min(100, Math.max(0, +o.fee || 0)),   // 예상 관리비 (만원)   // 열 때 바로 보여줄 관심 지역 (favKey)
  };
};

const clean = x => {
  const o = x && typeof x === 'object' ? x : {};
  return {
    fav: Array.isArray(o.fav) ? o.fav.slice(0, 20) : [],
    cmp: Array.isArray(o.cmp) ? o.cmp.slice(0, 20) : [],
    budget: o.budget && typeof o.budget === 'object' ? { dep: +o.budget.dep || 0, rent: +o.budget.rent || 0 } : null,
    prefs: cleanPrefs(o.prefs),
  };
};

export async function onRequestGet({ request, env }) {
  const d = await db(env);
  const u = d ? await currentUser(request, d) : null;
  if (!u) return json({ error: '로그인이 필요해요' }, 401);
  const row = await d.prepare('SELECT data FROM wsg_saved WHERE user_id = ?').bind(u.id).first();
  return json({ data: row ? clean(JSON.parse(row.data)) : clean(null) });
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const d = await db(env);
  const u = d ? await currentUser(request, d) : null;
  if (!u) return json({ error: '로그인이 필요해요' }, 401);
  const text = await request.text();
  if (text.length > 65536) return json({ error: '저장할 내용이 너무 커요' }, 413);
  let body; try { body = JSON.parse(text); } catch { return json({ error: 'bad request' }, 400); }
  const data = JSON.stringify(clean(body.data));
  await d.prepare('INSERT INTO wsg_saved (user_id, data, updated) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated')
    .bind(u.id, data, new Date().toISOString()).run();
  return json({ ok: true });
}
