// 로그인 공통 (Cloudflare Pages Functions + D1)
// 저장하는 것: 회원 번호, 로그인 방식별 고유 ID, 이메일(받은 경우), 닉네임, 세션(해시), 저장한 관심 지역·비교 목록.
// 비밀번호는 저장하지 않는다(이메일은 일회용 로그인 링크).
export const SESSION_DAYS = 30;
export const COOKIE = 'wsg_sid';

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export function rand(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function sha256(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export function setCookie(name, value, { maxAge, secure = true, path = '/' } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}${maxAge != null ? `; Max-Age=${maxAge}` : ''}`;
}
export const isLocal = request => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(request.url).hostname);

export async function db(env) {
  const d = env.STATS_DB || env.DB;
  if (!d) return null;
  if (!db.ready) {
    await d.batch([
      d.prepare('CREATE TABLE IF NOT EXISTS wsg_users (id TEXT PRIMARY KEY, email TEXT, nickname TEXT, created TEXT NOT NULL, last_login TEXT)'),
      d.prepare('CREATE INDEX IF NOT EXISTS wsg_users_email ON wsg_users(email)'),
      d.prepare('CREATE TABLE IF NOT EXISTS wsg_accounts (provider TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY (provider, provider_id))'),
      d.prepare('CREATE TABLE IF NOT EXISTS wsg_sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)'),
      d.prepare('CREATE TABLE IF NOT EXISTS wsg_login_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, ip TEXT, expires INTEGER NOT NULL, created INTEGER NOT NULL)'),
      d.prepare('CREATE TABLE IF NOT EXISTS wsg_saved (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL)'),
    ]);
    db.ready = true;
  }
  return d;
}

// 로그인한 사용자 (없으면 null)
export async function currentUser(request, d) {
  const sid = cookies(request)[COOKIE];
  if (!sid || !d) return null;
  const row = await d.prepare('SELECT u.id, u.email, u.nickname, s.id_hash FROM wsg_sessions s JOIN wsg_users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires > ?')
    .bind(await sha256(sid), Date.now()).first();
  if (!row) return null;
  const { results } = await d.prepare('SELECT provider FROM wsg_accounts WHERE user_id = ?').bind(row.id).all();
  return { id: row.id, email: row.email, nickname: row.nickname, providers: results.map(r => r.provider), sid_hash: row.id_hash };
}

// 로그인 방식별 계정 → 회원. 같은 (확인된) 이메일이면 기존 회원에 연결한다.
export async function upsertUser(d, { provider, providerId, email, emailVerified, nickname }) {
  const now = new Date().toISOString();
  const acc = await d.prepare('SELECT user_id FROM wsg_accounts WHERE provider = ? AND provider_id = ?').bind(provider, providerId).first();
  let userId = acc?.user_id;
  if (!userId && email && emailVerified) {
    const u = await d.prepare('SELECT id FROM wsg_users WHERE email = ?').bind(email).first();
    if (u) userId = u.id;
  }
  if (!userId) {
    userId = crypto.randomUUID();
    await d.prepare('INSERT INTO wsg_users (id, email, nickname, created, last_login) VALUES (?, ?, ?, ?, ?)').bind(userId, emailVerified ? email : null, nickname || null, now, now).run();
  } else {
    await d.prepare('UPDATE wsg_users SET last_login = ?, nickname = COALESCE(nickname, ?), email = COALESCE(email, ?) WHERE id = ?').bind(now, nickname || null, emailVerified ? email : null, userId).run();
  }
  if (!acc) await d.prepare('INSERT OR IGNORE INTO wsg_accounts (provider, provider_id, user_id, created) VALUES (?, ?, ?, ?)').bind(provider, providerId, userId, now).run();
  return userId;
}

export async function startSession(d, userId, request) {
  const sid = rand(32);
  await d.prepare('INSERT INTO wsg_sessions (id_hash, user_id, expires) VALUES (?, ?, ?)').bind(await sha256(sid), userId, Date.now() + SESSION_DAYS * 864e5).run();
  // 오래된 세션·토큰 정리
  await d.batch([
    d.prepare('DELETE FROM wsg_sessions WHERE expires < ?').bind(Date.now()),
    d.prepare('DELETE FROM wsg_login_tokens WHERE expires < ?').bind(Date.now() - 864e5),
  ]);
  return setCookie(COOKIE, sid, { maxAge: SESSION_DAYS * 86400, secure: !isLocal(request) });
}

// 로그인 뒤 돌아갈 주소: 같은 사이트의 경로만 허용
export function safeNext(v) {
  return typeof v === 'string' && /^\/(?!\/)[^\s\\]*$/.test(v) ? v.slice(0, 300) : '/';
}

// 데이터를 바꾸는 요청은 같은 사이트에서 온 것만 받는다 (SameSite 쿠키에 더해 한 번 더)
export function sameOrigin(request) {
  const o = request.headers.get('origin');
  return !o || o === new URL(request.url).origin;
}

// 회원과 그 회원의 모든 데이터를 지운다
export async function deleteUser(d, userId) {
  const u = await d.prepare('SELECT email FROM wsg_users WHERE id = ?').bind(userId).first();
  await d.batch([
    d.prepare('DELETE FROM wsg_saved WHERE user_id = ?').bind(userId),
    d.prepare('DELETE FROM wsg_sessions WHERE user_id = ?').bind(userId),
    d.prepare('DELETE FROM wsg_accounts WHERE user_id = ?').bind(userId),
    d.prepare('DELETE FROM wsg_login_tokens WHERE email = ?').bind(u?.email || ''),
    d.prepare('DELETE FROM wsg_users WHERE id = ?').bind(userId),
  ]);
}
