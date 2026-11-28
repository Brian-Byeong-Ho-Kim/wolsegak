const youthDirectory = fetch('/youth/notices.json').then(r => {
  if (!r.ok) throw Error('공고 자료 오류');
  return r.json();
}).catch(() => []);
const noticeId = n => new URL(n.url).searchParams.get('panId');
const summaryUrl = n => {
  const p = new URLSearchParams({id:noticeId(n), title:n.title, region:n.region, posted:n.posted, end:n.end, url:n.url});
  return '/youth/notice/?' + p;
};
function rememberNotice(n) {
  try { sessionStorage.setItem('notice:' + noticeId(n), JSON.stringify(n)); } catch {}
}
function showHousingMap(host, entries, region) {
  host.replaceChildren();
  const sites = entries.flatMap(n => (n.sites || []).filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon)).map(s => ({...s, notice:n})));
  if (!sites.length) {
    host.textContent = region + ' · 확인된 공급 단지 좌표가 없습니다. 상세 주소는 공고 원문에서 확인하세요.';
    return;
  }
  const select = document.createElement('select');
  select.setAttribute('aria-label','지도에 표시할 공급 단지');
  sites.forEach((s,i) => select.add(new Option((s.name || s.notice.title) + ' · ' + s.address,i)));
  const frame = document.createElement('iframe');
  frame.title = '선택한 공급 단지 위치'; frame.loading = 'lazy';
  frame.style.cssText = 'width:100%;height:320px;border:0;border-radius:12px;margin-top:10px';
  const link = document.createElement('a'); link.textContent = '이 단지 공고 요약 보기';
  function choose(){
    const s=sites[select.selectedIndex];
    const params = new URLSearchParams({bbox:[s.lon-.012,s.lat-.008,s.lon+.012,s.lat+.008].join(','),layer:'mapnik',marker:s.lat+','+s.lon});
    frame.src='https://www.openstreetmap.org/export/embed.html?'+params;
    link.href=summaryUrl(s.notice);
  }
  select.onchange=choose;host.append(select,frame,link);choose();
}
