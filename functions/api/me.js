// 내 정보
//   GET    /api/me → {user: {nickname, email, providers}} 또는 {user: null}
//   DELETE /api/me → 회원 탈퇴: 회원·로그인 연결·세션·저장 데이터를 바로 지운다
import { json, db, currentUser, setCookie, COOKIE, isLocal, sameOrigin, deleteUser } from '../../lib/auth.js';

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
  // 카카오로 가입했으면 카카오 쪽 앱 연결도 끊는다 (어드민 키가 있을 때)
  if (env.KAKAO_ADMIN_KEY) {
    const { results } = await d.prepare("SELECT provider_id FROM wsg_accounts WHERE user_id = ? AND provider = 'kakao'").bind(u.id).all();
    for (const r of results) {
      await fetch('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST', headers: { authorization: `KakaoAK ${env.KAKAO_ADMIN_KEY}`, 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams({ target_id_type: 'user_id', target_id: r.provider_id }),
      }).catch(() => null);
    }
  }
  await deleteUser(d, u.id);
  return json({ ok: true }, 200, { 'set-cookie': setCookie(COOKIE, '', { maxAge: 0, secure: !isLocal(request) }) });
}
