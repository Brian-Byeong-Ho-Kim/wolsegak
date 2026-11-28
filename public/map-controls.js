let __nl = {}; fetch('/data/naver_layers.json').then(r => r.json()).then(j => { __nl = j; }).catch(() => {});
const nLand = (p, z) => 'https://fin.land.naver.com/map?zoom=' + (z || 16) + '&tradeTypes=B1-B2&realEstateTypes=A05-A06-A07-C02-A02' + (__nl[window.__nvCode] ? '&layer=' + __nl[window.__nvCode] : '');
const dLand = (p, z) => 'https://www.dabangapp.com/map/onetwo?m_lat=' + p.getLat().toFixed(6) + '&m_lng=' + p.getLng().toFixed(6) + '&m_zoom=' + (z || 16);
const zLand = (p, z) => 'https://www.zigbang.com/home/oneroom/map';
const nLink = (p, z) => '<span class="nlinks"><a class="nlink" title="네이버 부동산: 이 지역(시군구)으로 열려요" href="' + nLand(p, z) + '" target="_blank" rel="noopener noreferrer">네이버↗</a><a class="nlink" title="직방: 지도만 열려요(검색창에 지역명 입력)" href="' + zLand(p, z || 18) + '" target="_blank" rel="noopener noreferrer">직방↗</a><a class="nlink" title="다방: 이 위치로 열려요" href="' + dLand(p, z || 18) + '" target="_blank" rel="noopener noreferrer">다방↗</a></span>';
function setupMapView(map, wrap, onReset) {
  const bar = document.createElement('div'); bar.className = 'mview';
  bar.innerHTML = '<button type="button" data-v="sky" aria-pressed="false" title="위성 사진으로 보기">🛰 스카이뷰</button><button type="button" data-v="road" aria-pressed="false" title="지도를 누르면 그 자리의 거리 사진을 보여 줘요">🚶 로드뷰</button><button type="button" data-v="naver" title="네이버 부동산을 이 지역(시군구) 기준으로 열어요">🏘 네이버 매물</button><button type="button" data-v="zig" title="직방 지도를 열어요 (위치 이동은 지원하지 않아 검색창에 지역명을 입력해 주세요)">직방</button><button type="button" data-v="dabang" title="다방에서 이 지도 위치의 매물 보기">다방</button><button type="button" data-v="reset" title="지도 설정(필터·스카이뷰·로드뷰·창 크기)을 처음 상태로">↺ 초기화</button><span class="mvmsg hide"></span>';
  const panel = document.createElement('div'); panel.className = 'rvpanel hide';
  panel.innerHTML = '<div class="rvgrip" title="위아래로 끌어서 로드뷰 크기 조절"></div><button type="button" class="rvx">✕ 닫기</button><div class="rvbox"></div>';
  wrap.querySelector('.map-footer').prepend(bar);
  const canvas = wrap.querySelector('.map-canvas');
  canvas.appendChild(panel);
  // In fullscreen, a status message can change the map height without resizing the window.
  const mapElement = canvas.querySelector('#map');
  let width = mapElement.clientWidth, height = mapElement.clientHeight;
  new ResizeObserver(() => {
    const nextWidth = mapElement.clientWidth, nextHeight = mapElement.clientHeight;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth; height = nextHeight;
    if (width && height) map.relayout();
  }).observe(mapElement);

  // 로드뷰 창 높이 조절 (위쪽 손잡이를 위아래로 끌기)
  const grip = panel.querySelector('.rvgrip'), RK = 'wsg-rvh';
  const setH = r => { r = Math.min(.85, Math.max(.2, r)); panel.style.height = (r * 100) + '%'; return r; };
  try { const v = +localStorage.getItem(RK); if (v) setH(v); } catch {}
  grip.addEventListener('pointerdown', e => { grip.setPointerCapture(e.pointerId); grip.dataset.on = 1; e.preventDefault(); });
  grip.addEventListener('pointermove', e => {
    if (!grip.dataset.on) return; const r = panel.offsetParent.getBoundingClientRect();
    setH((r.bottom - e.clientY) / r.height); if (rv) rv.relayout();
  });
  const gEnd = () => { if (!grip.dataset.on) return; delete grip.dataset.on; try { localStorage.setItem(RK, parseFloat(panel.style.height) / 100); } catch {} if (rv) rv.relayout(); };
  grip.addEventListener('pointerup', gEnd); grip.addEventListener('pointercancel', gEnd);
  const msg = bar.querySelector('.mvmsg'); let rv = null, rvc = null, mk = null, mkEl = null;
  const say = t => { msg.textContent = t || ''; msg.classList.toggle('hide', !t); };
  const openRv = (ll, face) => {
    if (!rvc) rvc = new kakao.maps.RoadviewClient();
    rvc.getNearestPanoId(ll, 80, id => {
      if (!id) { say('이 근처에는 로드뷰가 없어요. 다른 곳을 눌러 보세요.'); return; }
      say(''); panel.classList.remove('hide');
      if (!rv) rv = new kakao.maps.Roadview(panel.querySelector('.rvbox'));
      if (!mk) {
        mkEl = document.createElement('div'); mkEl.className = 'rvmk'; mkEl.innerHTML = '<i></i><b>🚶</b>';
        mk = new kakao.maps.CustomOverlay({ content: mkEl, xAnchor: .5, yAnchor: .5, zIndex: 50 });
        kakao.maps.event.addListener(rv, 'position_changed', () => { const p = rv.getPosition(); mk.setPosition(p); mk.setMap(map); });
        kakao.maps.event.addListener(rv, 'viewpoint_changed', () => { mkEl.firstChild.style.transform = 'rotate(' + rv.getViewpoint().pan + 'deg)'; });
      }
      mk.setPosition(ll); mk.setMap(map);
      rv.setPanoId(id, ll); setTimeout(() => rv.relayout(), 50);
      if (face) setTimeout(() => {   // 건물(실거래 핀) 쪽을 바라보도록 방향을 맞춘다
        try {
          const pp = rv.getPosition(), dx = (ll.getLng() - pp.getLng()) * Math.cos(pp.getLat() * Math.PI / 180), dy = ll.getLat() - pp.getLat();
          if (Math.abs(dx) + Math.abs(dy) > 1e-7) rv.setViewpoint({ pan: (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360, tilt: 0, zoom: 0 });
        } catch {}
      }, 700);
    });
  };
  bar.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    if (b.dataset.v === 'naver' || b.dataset.v === 'zig' || b.dataset.v === 'dabang') { const z = Math.max(10, Math.min(19, 20 - map.getLevel())); window.open((b.dataset.v === 'naver' ? nLand : b.dataset.v === 'zig' ? zLand : dLand)(map.getCenter(), z), '_blank', 'noopener'); return; }
    if (b.dataset.v === 'reset') {
      bar.querySelectorAll('button[aria-pressed]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP); map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
      window.__rvOn = false; say(''); panel.classList.add('hide'); panel.style.height = ''; if (mk) mk.setMap(null);
      try { localStorage.removeItem('wsg-rvh'); localStorage.removeItem('wsg-lw'); } catch {}
      document.documentElement.style.removeProperty('--lw');
      if (onReset) onReset();
      setTimeout(() => map.relayout(), 60); say('설정을 처음 상태로 돌렸어요.'); setTimeout(() => say(''), 2500);
      return;
    }
    const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
    if (b.dataset.v === 'sky') map.setMapTypeId(on ? kakao.maps.MapTypeId.HYBRID : kakao.maps.MapTypeId.ROADMAP);
    else {
      window.__rvOn = on;
      if (on) { map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW); say('지도의 파란 길을 눌러 보세요.'); }
      else { map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW); say(''); panel.classList.add('hide'); if (mk) mk.setMap(null); }
    }
  });
  window.__rvOpen = ll => openRv(ll, true);
  kakao.maps.event.addListener(map, 'click', e => { if (window.__rvOn) openRv(e.latLng); });
  panel.querySelector('.rvx').onclick = () => { panel.classList.add('hide'); if (mk) mk.setMap(null); };
}
