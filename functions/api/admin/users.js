// 관리자: 회원 목록 (대표만)
//   GET    /api/admin/users?q=검색어  → 회원 목록·합계
//   DELETE /api/admin/users?id=회원ID → 그 회원 탈퇴 처리 (카카오 앱 연결도 끊음)
// 접근: 사이트에 로그인한 계정의 이메일이 환경 변수 ADMIN_EMAILS(쉼표로 여러 개)에 있어야 한다.
import { json, db, currentUser, sameOrigin, deleteUser } from '../../../lib/auth.js';

async function admin(request, env) {
  const d = await db(env);
  if (!d) return { err: json({ error: 'D1(STATS_DB)이 연결되지 않았어요' }, 503) };
  const allow = String(env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allow.length) return { err: json({ error: 'ADMIN_EMAILS가 설정되지 않았어요', code: 'no_admin' }, 503) };
  const u = await currentUser(request, d);
  if (!u) return { err: json({ error: '로그인이 필요해요', code: 'login' }, 401) };
  if (!u.email || !allow.includes(u.email.toLowerCase())) return { err: json({ error: '관리자 계정이 아니에요', code: 'forbidden', you: u.email || null }, 403) };
  return { d, u };
}

export async function onRequestGet({ request, env }) {
  const { d, err } = await admin(request, env);
  if (err) return err;
  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const { results } = await d.prepare(`
    SELECT u.id, u.nickname, u.email, u.created, u.last_login,
      (SELECT GROUP_CONCAT(provider) FROM wsg_accounts a WHERE a.user_id = u.id) AS providers,
      (SELECT updated FROM wsg_saved s WHERE s.user_id = u.id) AS saved_updated
    FROM wsg_users u
    ${q ? 'WHERE u.nickname LIKE ?1 OR u.email LIKE ?1' : ''}
    ORDER BY u.created DESC LIMIT 1000`).bind(...(q ? [like] : [])).all();
  const total = (await d.prepare('SELECT COUNT(*) n FROM wsg_users').first()).n;
  return json({ total, shown: results.length, users: results });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { d, u, err } = await admin(request, env);
  if (err) return err;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: '회원 ID가 필요해요' }, 400);
  if (id === u.id) return json({ error: '본인 계정은 내 정보 화면에서 탈퇴하세요' }, 400);
  if (env.KAKAO_ADMIN_KEY) {
    const { results } = await d.prepare("SELECT provider_id FROM wsg_accounts WHERE user_id = ? AND provider = 'kakao'").bind(id).all();
    for (const r of results) {
      await fetch('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST', headers: { authorization: `KakaoAK ${env.KAKAO_ADMIN_KEY}`, 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams({ target_id_type: 'user_id', target_id: r.provider_id }),
      }).catch(() => null);
    }
  }
  await deleteUser(d, id);
  return json({ ok: true });
}
