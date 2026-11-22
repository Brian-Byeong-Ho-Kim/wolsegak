// 로그인 API
//   GET  /api/auth/config            → 켜진 로그인 방식 {kakao, email}
//   GET  /api/auth/kakao?next=/      → 카카오 로그인 화면으로
//   GET  /api/auth/kakao/callback    → 카카오에서 돌아옴 → 세션 발급
//   POST /api/auth/email {email,next}→ 로그인 링크 메일 발송 (15분 유효, 한 번만)
//   GET  /api/auth/email/verify?t=   → 링크 확인 → 세션 발급
//   POST /api/auth/logout
//   GET|POST /api/auth/kakao/unlink  → 카카오 「연결 끊기」 알림(웹훅). 사용자가 카카오에서 앱 연결을 끊으면 계정을 지운다
// 필요한 환경변수(Cloudflare Pages → Settings → Variables and Secrets):
//   KAKAO_REST_KEY, KAKAO_CLIENT_SECRET(비밀)  — 카카오 로그인
//   KAKAO_ADMIN_KEY(비밀), KAKAO_APP_ID        — 연결 끊기 알림 검증, 탈퇴 시 카카오 연결 끊기
//   RESEND_API_KEY(비밀), MAIL_FROM("월세각 <login@wolsegak.com>") — 이메일 로그인
import { json, rand, sha256, cookies, setCookie, isLocal, db, upsertUser, startSession, currentUser, safeNext, sameOrigin, deleteUser, COOKIE } from '../../../lib/auth.js';

const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i;
const redirect = (to, cookieList = []) => {
  const h = new Headers({ location: to, 'cache-control': 'no-store' });
  for (const c of cookieList) h.append('set-cookie', c);
  return new Response(null, { status: 302, headers: h });
};
// 돌아갈 주소 (오류가 있으면 ?login_error= 를 # 앞에 붙인다)
const back = (next, err) => {
  const n = safeNext(next); if (!err) return n;
  const i = n.indexOf('#'), path = i < 0 ? n : n.slice(0, i), hash = i < 0 ? '' : n.slice(i);
  return `${path}${path.includes('?') ? '&' : '?'}login_error=${encodeURIComponent(err)}${hash}`;
};

export async function onRequest(ctx) {
  const { request, env, params } = ctx;
  const path = (params.path || []).join('/');
  const url = new URL(request.url);
  const d = await db(env);
  if (!d) return json({ error: '데이터베이스가 연결되지 않았어요 (STATS_DB)' }, 503);
  const secure = !isLocal(request);
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'forbidden' }, 403);

  if (path === 'config') {
    return json({ kakao: !!env.KAKAO_REST_KEY, email: !!(env.RESEND_API_KEY && env.MAIL_FROM) || env.DEV_MAIL === '1' });
  }

  // ---------- 카카오 ----------
  if (path === 'kakao' && request.method === 'GET') {
    if (!env.KAKAO_REST_KEY) return redirect(back(url.searchParams.get('next'), '카카오 로그인이 아직 준비 중이에요'));
    const state = rand(16);
    const q = new URLSearchParams({ response_type: 'code', client_id: env.KAKAO_REST_KEY, redirect_uri: `${url.origin}/api/auth/kakao/callback`, state });
    return redirect(`https://kauth.kakao.com/oauth/authorize?${q}`, [
      setCookie('wsg_st', `${state}|${safeNext(url.searchParams.get('next'))}`, { maxAge: 600, secure, path: '/api/auth' }),
    ]);
  }
  if (path === 'kakao/callback') {
    const [state, next] = (cookies(request).wsg_st || '').split('|');
    const clear = setCookie('wsg_st', '', { maxAge: 0, secure, path: '/api/auth' });
    if (!state || state !== url.searchParams.get('state')) return redirect(back(next, '로그인 요청이 만료됐어요. 다시 시도해 주세요'), [clear]);
    if (url.searchParams.get('error')) return redirect(back(next, url.searchParams.get('error') === 'access_denied' ? '' : '카카오 로그인을 완료하지 못했어요'), [clear]);
    const tok = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: env.KAKAO_REST_KEY, redirect_uri: `${url.origin}/api/auth/kakao/callback`, code: url.searchParams.get('code') || '', ...(env.KAKAO_CLIENT_SECRET ? { client_secret: env.KAKAO_CLIENT_SECRET } : {}) }),
    }).then(r => r.json()).catch(() => null);
    if (!tok?.access_token) return redirect(back(next, '카카오 로그인을 완료하지 못했어요'), [clear]);
    const me = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json()).catch(() => null);
    if (!me?.id) return redirect(back(next, '카카오 사용자 정보를 받지 못했어요'), [clear]);
    const ka = me.kakao_account || {};
    const email = ka.email && ka.is_email_valid && ka.is_email_verified ? String(ka.email).toLowerCase() : null;
    const userId = await upsertUser(d, { provider: 'kakao', providerId: String(me.id), email, emailVerified: !!email, nickname: ka.profile?.nickname || me.properties?.nickname || null });
    // 카카오 토큰은 저장하지 않는다(로그인 확인에만 쓰고 버림)
    return redirect(back(next), [clear, await startSession(d, userId, request)]);
  }

  // ---------- 카카오 연결 끊기 알림 (3초 안에 200으로 답해야 함) ----------
  if (path === 'kakao/unlink') {
    if (!env.KAKAO_ADMIN_KEY || request.headers.get('authorization') !== `KakaoAK ${env.KAKAO_ADMIN_KEY}`) return new Response('unauthorized', { status: 401 });
    let p = url.searchParams;
    if (request.method === 'POST') { const f = await request.formData().catch(() => null); if (f) p = f; }
    const appId = String(p.get('app_id') || ''), kid = String(p.get('user_id') || '');
    if (env.KAKAO_APP_ID && appId !== String(env.KAKAO_APP_ID)) return new Response('bad app', { status: 400 });
    if (kid) {
      const acc = await d.prepare("SELECT user_id FROM wsg_accounts WHERE provider = 'kakao' AND provider_id = ?").bind(kid).first();
      if (acc) {
        await d.prepare("DELETE FROM wsg_accounts WHERE provider = 'kakao' AND provider_id = ?").bind(kid).run();
        const left = (await d.prepare('SELECT COUNT(*) n FROM wsg_accounts WHERE user_id = ?').bind(acc.user_id).first()).n;
        if (!left) await deleteUser(d, acc.user_id);   // 다른 로그인 방식이 없으면 회원 전체 삭제
        else await d.prepare('DELETE FROM wsg_sessions WHERE user_id = ?').bind(acc.user_id).run();
      }
    }
    return new Response('OK', { status: 200 });
  }

  // ---------- 이메일 로그인 링크 ----------
  if (path === 'email' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL.test(email)) return json({ error: '이메일 주소를 확인해 주세요' }, 400);
    const devMail = env.DEV_MAIL === '1' && isLocal(request);
    if (!(env.RESEND_API_KEY && env.MAIL_FROM) && !devMail) return json({ error: '이메일 로그인이 아직 준비 중이에요' }, 503);
    const ip = request.headers.get('cf-connecting-ip') || '';
    const hour = Date.now() - 36e5;
    const n1 = (await d.prepare('SELECT COUNT(*) n FROM wsg_login_tokens WHERE email = ? AND created > ?').bind(email, hour).first()).n;
    const n2 = ip ? (await d.prepare('SELECT COUNT(*) n FROM wsg_login_tokens WHERE ip = ? AND created > ?').bind(ip, hour).first()).n : 0;
    if (n1 >= 5 || n2 >= 20) return json({ error: '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요' }, 429);
    const t = rand(32);
    await d.prepare('INSERT INTO wsg_login_tokens (token_hash, email, ip, expires, created) VALUES (?, ?, ?, ?, ?)').bind(await sha256(t), email, ip, Date.now() + 15 * 6e4, Date.now()).run();
    const link = `${url.origin}/api/auth/email/verify?t=${t}&next=${encodeURIComponent(safeNext(body.next))}`;
    if (devMail) { console.log('[DEV 로그인 링크]', link); return json({ ok: true, dev_link: link }); }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM, to: [email], subject: '월세각 로그인 링크',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px"><h2 style="margin:0 0 12px">월세각 로그인</h2><p>아래 버튼을 누르면 로그인돼요. 링크는 <b>15분 동안 한 번만</b> 쓸 수 있어요.</p><p style="margin:24px 0"><a href="${link}" style="background:#ff6b3d;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:700">월세각에 로그인</a></p><p style="color:#6d635c;font-size:13px">직접 요청하지 않았다면 이 메일은 무시하세요. 아무 일도 일어나지 않아요.</p></div>`,
        text: `월세각 로그인 링크 (15분 동안 한 번만 쓸 수 있어요)\n${link}\n\n직접 요청하지 않았다면 무시하세요.`,
      }),
    });
    if (!r.ok) return json({ error: '메일을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요' }, 502);
    return json({ ok: true });
  }
  // 메일 보안 검사기가 링크를 미리 열어 일회용 링크를 써 버리지 않도록, GET은 확인 화면만 보여 주고 POST로 로그인한다
  if (path === 'email/verify' && request.method === 'GET') {
    const t = (url.searchParams.get('t') || '').replace(/[^A-Za-z0-9_-]/g, ''), next = safeNext(url.searchParams.get('next'));
    const esc = v => v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>월세각 로그인</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#fff8f3;margin:0;display:grid;place-items:center;min-height:100vh">
<form method="post" action="/api/auth/email/verify" style="background:#fff;border:1px solid #efe3da;border-radius:18px;padding:28px;max-width:360px;text-align:center">
<h1 style="font-size:20px;margin:0 0 8px">월세각 로그인</h1><p style="color:#6d635c;margin:0 0 18px">버튼을 누르면 로그인돼요.</p>
<input type="hidden" name="t" value="${esc(t)}"><input type="hidden" name="next" value="${esc(next)}">
<button style="border:0;background:#ff6b3d;color:#fff;font-weight:700;font-size:17px;padding:14px 24px;border-radius:14px;cursor:pointer;width:100%">로그인 계속하기</button>
</form><script>document.forms[0].submit()</script></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'same-origin' } });
  }
  if (path === 'email/verify' && request.method === 'POST') {
    const f = await request.formData().catch(() => null);
    const next = f?.get('next');
    const th = await sha256(String(f?.get('t') || ''));
    const row = await d.prepare('SELECT email, expires FROM wsg_login_tokens WHERE token_hash = ?').bind(th).first();
    if (!row || row.expires < Date.now()) return redirect(back(next, '로그인 링크가 만료됐거나 이미 쓰였어요. 다시 받아 주세요'));
    await d.prepare('DELETE FROM wsg_login_tokens WHERE token_hash = ?').bind(th).run();   // 한 번만
    const userId = await upsertUser(d, { provider: 'email', providerId: row.email, email: row.email, emailVerified: true, nickname: null });
    return redirect(back(next), [await startSession(d, userId, request)]);
  }

  if (path === 'logout' && request.method === 'POST') {
    const u = await currentUser(request, d);
    if (u) await d.prepare('DELETE FROM wsg_sessions WHERE id_hash = ?').bind(u.sid_hash).run();
    return json({ ok: true }, 200, { 'set-cookie': setCookie(COOKIE, '', { maxAge: 0, secure }) });
  }
  return json({ error: 'not found' }, 404);
}
