// 공유 링크(/?r=…)로 열 때 링크 미리보기(카카오톡·문자·SNS)의 제목·설명·이미지를 결과에 맞게 바꾼다.
// 그 밖의 요청은 그대로 통과한다. 판정은 공유한 브라우저가 계산한 값이며, 여기서는 글자만 끼워 넣는다.
const VERDICT = {
  good: '이 방, 시세보다 싼 편이래요',
  ok: '이 방, 시세에 맞는 적정한 편이래요',
  warn: '이 방, 시세보다 조금 비싼 편이래요',
  bad: '이 방, 시세보다 비싼 편이래요',
  bait: '시세보다 너무 싸요 — 미끼매물 주의',
};
const comma = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const won = m => (m >= 10000 ? `${Math.floor(m / 10000)}억${m % 10000 ? ' ' + comma(m % 10000) : ''}만원` : `${comma(m)}만원`);

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const r = url.searchParams.get('r');
  if (url.pathname !== '/' || !Object.hasOwn(VERDICT, r || '')) return ctx.next();
  const res = await ctx.next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;

  const num = k => { const v = Math.round(Number(url.searchParams.get(k))); return url.searchParams.has(k) && Number.isFinite(v) && v >= 0 && v < 1e7 ? v : null; };
  const w = (url.searchParams.get('w') || '').replace(/[<>"'&`\u0000-\u001f]/g, '').trim().slice(0, 40);
  const dep = num('dep'), rent = num('rent'), pc = num('pc'), n = num('n');
  const jeonse = url.searchParams.get('m') === 'jeonse';
  const price = dep == null ? '' : jeonse ? `전세 ${won(dep)}` : rent != null ? `보증금 ${won(dep)} / 월세 ${comma(rent)}만원` : '';
  const pos = r === 'bait' || pc == null || pc > 100 ? '' : pc <= 50 ? ` 중 싼 쪽 ${Math.max(1, pc)}%` : ` 중 비싼 쪽 ${Math.max(1, 100 - pc)}%`;
  const title = `${VERDICT[r]} | 월세각`;
  const desc = [[w, price].filter(Boolean).join(' · '), n ? `같은 동네 비슷한 집 실거래 ${comma(n)}건${pos}` : '', '내가 본 방도 30초면 확인해요.'].filter(Boolean).join(' — ');
  const img = `${url.origin}/og/${r}.png`;

  const set = v => ({ element(e) { e.setAttribute('content', v); } });
  return new HTMLRewriter()
    .on('head > title', { element(e) { e.setInnerContent(title); } })
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[property="og:image"]', set(img))
    .on('meta[property="og:url"]', set(url.href))
    .transform(res);
}
