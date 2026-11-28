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
// 카카오 지도 SDK를 한 번만 불러온다(메인 지도와 같은 키·도메인).
const YOUTH_KAKAO_KEY = '6c67906fb926c31e6e09524a74d819c6';
let kakaoMapReady;
function loadKakaoMap() {
  if (window.kakao && kakao.maps && kakao.maps.Map) return Promise.resolve();
  return kakaoMapReady || (kakaoMapReady = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + YOUTH_KAKAO_KEY + '&autoload=false';
    sc.onload = () => kakao.maps.load(res);
    sc.onerror = () => { kakaoMapReady = null; rej(new Error('kakao sdk')); };
    document.head.appendChild(sc);
  }));
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
  const box = document.createElement('div');
  box.setAttribute('role', 'img'); box.setAttribute('aria-label', '선택한 공급 단지 위치');
  box.style.cssText = 'width:100%;height:320px;border-radius:12px;margin-top:10px;background:#f1f0ee';
  const link = document.createElement('a'); link.textContent = '이 단지 공고 요약 보기';
  let map, marker;
  function choose(){
    const s=sites[select.selectedIndex];
    link.href=summaryUrl(s.notice);
    loadKakaoMap().then(() => {
      const pos = new kakao.maps.LatLng(s.lat, s.lon);
      if (!map) {
        map = new kakao.maps.Map(box, { center: pos, level: 4 });
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
        marker = new kakao.maps.Marker({ position: pos, map });
        const d = host.closest('details');
        if (d) d.addEventListener('toggle', () => { if (d.open) { map.relayout(); map.setCenter(marker.getPosition()); } });
      } else { marker.setPosition(pos); map.setCenter(pos); }
    }).catch(() => { box.textContent = '지도를 불러오지 못했어요. 상세 주소는 공고 원문에서 확인하세요.'; box.style.padding = '12px'; });
  }
  select.onchange=choose;host.append(select,box,link);choose();
}
