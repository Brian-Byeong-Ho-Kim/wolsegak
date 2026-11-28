// 매물 링크의 미리보기 정보(og:title·og:description)만 읽는다 — 메신저 링크 미리보기와 같은 수준.
// 매물 API나 상세 데이터는 가져오지 않는다. 허용한 부동산 사이트 주소만 받는다.
const ALLOW = [/(^|\.)zigbang\.com$/, /(^|\.)dabangapp\.com$/, /(^|\.)peterpanz\.com$/];
const json = (body, status = 200, ttl = 0) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': ttl ? `public, max-age=${ttl}` : 'no-store' },
});
const pick = (html, re) => { const m = html.match(re); return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : null; };

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('url') || '';
  let target;
  try { target = new URL(u); } catch { return json({ error: '링크 형식이 아니에요' }, 400); }
  if (!/^https?:$/.test(target.protocol) || !ALLOW.some(r => r.test(target.hostname))) return json({ error: '직방·다방 링크만 붙여 넣을 수 있어요' }, 400);

  const cache = caches.default, key = new Request('https://wolsegak.com/api/preview?u=' + encodeURIComponent(target.href));
  const hit = await cache.match(key);
  if (hit) return hit;

  let html = '', finalUrl = target.href;
  try {
    let res, url = target.href;
    for (let i = 0; i < 5; i++) {  // 리다이렉트도 허용 목록 안에서만 따라간다
      res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; wolsegak-linkpreview/1.0; +https://wolsegak.com)', accept: 'text/html' }, cf: { cacheTtl: 3600 } });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, url);
        if (!ALLOW.some(r => r.test(next.hostname))) return json({ error: '허용되지 않은 주소로 이동하는 링크예요' }, 400);
        url = next.href; continue;
      }
      break;
    }
    finalUrl = url;
    if (!res.ok) return json({ error: `미리보기를 읽지 못했어요 (${res.status})` }, 502);
    const reader = res.body.getReader(); const dec = new TextDecoder(); let got = 0;
    while (got < 300000) { const { done, value } = await reader.read(); if (done) break; got += value.length; html += dec.decode(value, { stream: true }); if (html.includes('</head>')) break; }
    reader.cancel().catch(() => {});
  } catch (e) { return json({ error: '미리보기를 읽지 못했어요' }, 502); }

  const out = {
    url: finalUrl,
    title: pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || pick(html, /<title>([^<]*)<\/title>/i),
    description: pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i),
  };
  const resp = json(out, 200, 86400);
  await cache.put(key, resp.clone());
  return resp;
}
