// 내 정보
//   GET    /api/me → {user: {nickname, email, providers}} 또는 {user: null}
//   DELETE /api/me → 회원 탈퇴: 회원·로그인 연결·세션·저장 데이터를 바로 지운다
import { json, db, currentUser, setCookie, COOKIE, isLocal, sameOrigin } from '../../lib/auth.js';

export async function onRequestGet({ request, env }) {
  const d = await db(env);
  const u = d ? await currentUser(request, d) : null;
  return json({ user: u ? { nickname: u.nickname, email: u.email, providers: u.providers } : null });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const d = await db(env);
  const u = d ? await currentUser(request, d) : null;
  if (!u) return json({ error: '로그인이 필요해요' }, 401);
  await d.batch([
    d.prepare('DELETE FROM wsg_saved WHERE user_id = ?').bind(u.id),
    d.prepare('DELETE FROM wsg_sessions WHERE user_id = ?').bind(u.id),
    d.prepare('DELETE FROM wsg_accounts WHERE user_id = ?').bind(u.id),
    d.prepare('DELETE FROM wsg_login_tokens WHERE email = ?').bind(u.email || ''),
    d.prepare('DELETE FROM wsg_users WHERE id = ?').bind(u.id),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': setCookie(COOKIE, '', { maxAge: 0, secure: !isLocal(request) }) });
}
