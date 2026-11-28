const A64 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
const OFF_X = 59382133607, OFF_Y = 58233041641;
function utmk(lat, lng) {
  const a = 6378137, f = 1 / 298.257222101, e2 = 2 * f - f * f, ep2 = e2 / (1 - e2), k0 = 0.9996, d = Math.PI / 180;
  const phi = lat * d, lam = (lng - 127.5) * d, phi0 = 38 * d;
  const M = p => a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * p - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * p) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * p) - (35 * e2 ** 3 / 3072) * Math.sin(6 * p));
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, Aa = lam * Math.cos(phi);
  const x = 1000000 + k0 * N * (Aa + (1 - T + C) * Aa ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * Aa ** 5 / 120);
  const y = 2000000 + k0 * (M(phi) - M(phi0) + N * Math.tan(phi) * (Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Aa ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * Aa ** 6 / 720));
  return [x, y];
}
const enc6 = v => { let s = ''; for (let i = 0; i < 6; i++) { s = A64[v % 64] + s; v = Math.floor(v / 64); } return s; };
function naverCenter(lat, lng) { const [x, y] = utmk(lat, lng); return enc6(Math.round(x * 100) + OFF_X) + '-' + enc6(Math.round(y * 100) + OFF_Y); }
window.__zcopy = function (fb) { var sg = ((window.__nvLabel || '').split(' ').slice(1).join(' ') || window.__nvLabel || ''), dg = window.__nvDong || window.__nvDong0 || '', t = dg ? (sg + ' ' + dg).trim() : (fb || sg); try { navigator.clipboard.writeText(t); } catch (e) {} var d = document.createElement('div'); d.textContent = '직방 검색창에 붙여넣기: ' + (t || '지역명'); d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1c1917;color:#fff;padding:9px 14px;border-radius:10px;font:600 13px Pretendard Variable,sans-serif;z-index:99999'; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500); };
const nLand = (p, z) => 'https://fin.land.naver.com/map?center=' + naverCenter(p.getLat(), p.getLng()) + '&zoom=' + Math.min(z || 15, 15.5) + '&tradeTypes=B1-B2&realEstateTypes=A05-A06-A07-C02-A02';
const dLand = (p, z) => 'https://www.dabangapp.com/map/onetwo?m_lat=' + p.getLat().toFixed(6) + '&m_lng=' + p.getLng().toFixed(6) + '&m_zoom=' + (z || 16);
const zLand = (p, z) => 'https://www.zigbang.com/home/oneroom/map';
const nLink = (p, z) => '<div class="nlinks">매물보기 : <a class="nlink" title="네이버 부동산: 이 위치 주변으로 열려요" href="' + nLand(p, z) + '" target="_blank" rel="noopener noreferrer">네이버</a>, <a class="nlink" title="다방: 이 위치로 열려요" href="' + dLand(p, z || 18) + '" target="_blank" rel="noopener noreferrer">다방</a>, <a class="nlink" title="직방: 지도만 열려요. 동 이름이 복사되니 검색창에 붙여넣어 주세요" onclick="window.__zcopy()" href="' + zLand(p, z || 18) + '" target="_blank" rel="noopener noreferrer">직방</a></div>';
function setupMapView(map, wrap, onReset) {
  const bar = document.createElement('div'); bar.className = 'mview';
  bar.innerHTML = '<button type="button" data-v="sky" aria-pressed="false" title="위성 사진으로 보기">🛰 스카이뷰</button><button type="button" data-v="road" aria-pressed="false" title="지도를 누르면 그 자리의 거리 사진을 보여 줘요">🚶 로드뷰</button><button type="button" data-v="naver" title="네이버 부동산을 이 위치 주변으로 열어요">🏘 네이버 매물</button><button type="button" data-v="dabang" title="다방에서 이 지도 위치의 매물 보기">다방</button><button type="button" data-v="zig" title="직방 지도를 열어요 (위치 이동은 지원하지 않아 검색창에 지역명을 입력해 주세요)">직방</button><button type="button" data-v="reset" title="지도 설정(필터·스카이뷰·로드뷰·창 크기)을 처음 상태로">↺ 초기화</button><span class="mvmsg hide"></span>';
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
    if (b.dataset.v === 'zig') window.__zcopy();
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
