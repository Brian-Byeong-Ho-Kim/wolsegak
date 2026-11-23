// 학교별 시세 페이지: 카카오맵에서 학교를 고르거나 목록에서 고르면 지도에 표시
(async () => {
  const KEY = '6c67906fb926c31e6e09524a74d819c6';
  const hint = document.getElementById('umapHint');
  try {
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KEY + '&autoload=false&libraries=services';
      sc.onload = () => kakao.maps.load(res); sc.onerror = rej; document.head.appendChild(sc);
    });
  } catch (e) { hint.textContent = '지도를 불러오지 못했어요. 아래 목록에서 학교를 골라 주세요.'; return; }
  const links = [...document.querySelectorAll('.sido a[data-k]')];
  let geo = {};
  try { geo = await (await fetch('/data/univ_geo.json')).json(); } catch (e) {}
  const LL = (a, b) => new kakao.maps.LatLng(a, b);
  const map = new kakao.maps.Map(document.getElementById('umap'), { center: LL(36.4, 127.8), level: 13 });
  const col = m => m == null ? '#78716c' : m < 35 ? '#16a34a' : m < 45 ? '#2563eb' : m < 55 ? '#d97706' : '#dc2626';
  const byKey = new Map();
  const bubble = document.createElement('div'); bubble.className = 'ubub';
  const bov = new kakao.maps.CustomOverlay({ content: bubble, yAnchor: 1.9, clickable: true, zIndex: 20 });
  let sel = null;
  const addrOf = k => links.find(a => a.dataset.k === k);
  const show = o => {
    bubble.innerHTML = `<div class="upop"><b>${o.name}</b><small>${o.m ? '원룸 중간 월세 ' + o.m + '만원' : '거래가 적어 시군구 기준으로 봐요'}</small><br><a href="${o.a.getAttribute('href')}" onclick="location.href=this.href;return false">시세 보기 →</a></div>`;
    bov.setPosition(o.pos); bov.setMap(map);
  };
  const select = (k, fly) => {
    const o = byKey.get(k); if (!o) return;
    if (sel) { sel.a.classList.remove('sel'); sel.el.classList.remove('on'); }
    sel = o; o.a.classList.add('sel'); o.el.classList.add('on');
    if (fly) { if (map.getLevel() > 5) map.setLevel(4); map.panTo(o.pos); }
    show(o);
  };
  for (const a of links) {
    const k = a.dataset.k, c = geo[k]; if (!c) continue;
    const m = a.dataset.m ? +a.dataset.m : null;
    const name = a.childNodes[0].textContent.trim();
    const el = document.createElement('div'); el.className = 'ud'; el.style.background = col(m); el.title = name;
    el.onclick = e => { e.stopPropagation(); select(k, false); };
    const pos = LL(c[0], c[1]);
    new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: .5, xAnchor: .5, clickable: true, map });
    byKey.set(k, { a, el, pos, m, name });
    // 목록: 누르면 그 학교 페이지로 이동, PC에서는 마우스를 올리면 지도가 그 학교로 이동
    a.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) select(k, true); });
  }
  kakao.maps.event.addListener(map, 'click', () => bov.setMap(null));
  if (!byKey.size) hint.textContent = '학교 위치를 아직 불러오지 못했어요. 아래 목록에서 학교를 골라 주세요.';
  document.getElementById('f').addEventListener('input', () => {
    const vis = links.filter(a => a.style.display !== 'none' && byKey.has(a.dataset.k));
    if (vis.length === 1) select(vis[0].dataset.k, true);
    else if (vis.length > 1 && vis.length < 12) { const b = new kakao.maps.LatLngBounds(); vis.forEach(a => b.extend(byKey.get(a.dataset.k).pos)); map.setBounds(b, 50, 50, 50, 50); }
  });
  matchMedia('(min-width:1024px)').addEventListener('change', () => setTimeout(() => map.relayout(), 80));
  setTimeout(() => map.relayout(), 100);
})();
