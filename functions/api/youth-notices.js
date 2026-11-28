const base = 'https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/';
function clean(html) {
  return html.replace(/<!--[\s\S]*?-->/g,'').replace(/<em\b[^>]*>[\s\S]*?<\/em>/gi,'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
}
export function parseNotices(html) {
  const notices = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), x => x[1]);
    if (cells.length !== 9) continue;
    const ids = cells[2].match(/data-id1="(\d+)"\s+data-id2="(\d+)"\s+data-id3="(\d+)"\s+data-id4="(\d+)"/);
    if (!ids) continue;
    const params = new URLSearchParams({mi:'1026',panId:ids[1],ccrCnntSysDsCd:ids[2],uppAisTpCd:ids[3],aisTpCd:ids[4]});
    notices.push({title:clean(cells[2]),region:clean(cells[3]),posted:clean(cells[5]),end:clean(cells[6]),status:clean(cells[7]),url:base+'selectWrtancInfo.do?'+params});
  }
  return notices;
}
export async function onRequestGet({request}) {
  const code = new URL(request.url).searchParams.get('region');
  if (!['11','26','27','28','30','31','36110','41','51','43','44','52','12','47','48','50'].includes(code)) return new Response(null,{status:400});
  try {
    const res = await fetch(base+'selectWrtancList.do?mi=1026&cnpCd='+code+'&listCo=50',{cf:{cacheTtl:1800,cacheEverything:true},signal:AbortSignal.timeout(10000)});
    if (!res.ok) throw Error();
    const html = await res.text();
    if (!html.includes('wrtancInfoBtn') || !html.includes('srchForm')) throw Error();
    return Response.json(parseNotices(html),{headers:{'Cache-Control':'public,max-age=900'}});
  } catch { return new Response(null,{status:503}); }
}
