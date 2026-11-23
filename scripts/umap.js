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
  const byKey = new Map(), labels = [];
  // 확대하면, 서로 안 겹치는 학교부터 이름을 보여 준다
  const layout = () => {
    const proj = map.getProjection(), box = document.getElementById('umap'), W = box.clientWidth, H = box.clientHeight, lv = map.getLevel();
    const taken = [], vis = [];
    for (const o of labels) {
      const p = proj.containerPointFromCoords(o.pos);
      if (p.x < -20 || p.y < -10 || p.x > W + 20 || p.y > H + 10) { o.sl.classList.remove('show'); continue; }
      vis.push({ o, x: p.x, y: p.y });
    }
    vis.sort((a, b) => a.o.pr - b.o.pr);
    for (const { o, x, y } of vis) {
      const b = [x - 8, y - 9, x + 10 + o.w, y + 9];
      const hit = lv > 11 || taken.some(t => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1]);
      o.sl.classList.toggle('show', !hit);
      taken.push(hit ? [x - 8, y - 8, x + 8, y + 8] : b);
    }
  };
  const bubble = document.createElement('div'); bubble.className = 'ubub';
  const bov = new kakao.maps.CustomOverlay({ content: bubble, yAnchor: 1.9, clickable: true, zIndex: 20 });
  let sel = null, lastDot = 0;
  const addrOf = k => links.find(a => a.dataset.k === k);
  const show = o => {
    bubble.innerHTML = `<div class="upop"><b>${o.name}</b><small>${o.m ? '원룸 중간 월세 ' + o.m + '만원' : '거래가 적어 시군구 기준으로 봐요'}</small><br><a href="${o.a.getAttribute('href')}" onclick="location.href=this.href;return false">시세 보기 →</a></div>`;
    bov.setPosition(o.pos); bov.setMap(map);
  };
  // 말풍선이 지도 밖으로 잘려 링크를 못 누르는 일이 없도록, 점이 가장자리에 있으면 지도를 살짝 밀어 준다
  const keepInView = pos => {
    try {
      const pt = map.getProjection().containerPointFromCoords(pos), box = document.getElementById('umap');
      const w = box.clientWidth, h = box.clientHeight;
      const dy = pt.y < 130 ? 130 - pt.y : pt.y > h - 30 ? h - 30 - pt.y : 0;
      const dx = pt.x < 120 ? 120 - pt.x : pt.x > w - 120 ? w - 120 - pt.x : 0;
      if (dx || dy) map.panBy(dx, dy);
    } catch (e) {}
  };
  const select = (k, fly) => {
    const o = byKey.get(k); if (!o) return;
    if (sel) { sel.a.classList.remove('sel'); sel.el.classList.remove('on'); }
    sel = o; o.a.classList.add('sel'); o.el.classList.add('on');
    if (fly) { if (map.getLevel() > 5) map.setLevel(4); map.panTo(o.pos); }
    else keepInView(o.pos);
    show(o);
  };
  for (const a of links) {
    const k = a.dataset.k, c = geo[k]; if (!c) continue;
    const m = a.dataset.m ? +a.dataset.m : null;
    const name = a.childNodes[0].textContent.trim();
    const el = document.createElement('div'); el.className = 'ud'; el.style.background = col(m); el.title = name;
    el.onclick = e => { e.stopPropagation(); lastDot = Date.now(); select(k, false); openSchool(k); };
    const pos = LL(c[0], c[1]);
    const sl = document.createElement('span'); sl.className = 'sl'; const short = name.replace(/\(.*\)/, ''); sl.textContent = short; el.appendChild(sl);
    labels.push({ pos, sl, w: short.length * 12.5 + 8, pr: /대학교$/.test(short) ? 0 : 1 });
    new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: .5, xAnchor: .5, clickable: true, map });
    byKey.set(k, { a, el, pos, m, name });
    // 목록: 누르면 그 학교 페이지로 이동, PC에서는 마우스를 올리면 지도가 그 학교로 이동
    a.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches && !picked) select(k, true); });
    // PC 넓은 화면: 학교를 누르면 오른쪽 지도에 그 학교 주변 실거래를 보여 준다 (학교 페이지는 말풍선의 '시세 보기'로)
    a.addEventListener('click', e => {
      if (!matchMedia('(min-width:1024px)').matches || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); select(k, true); openSchool(k);
    });
  }

  // ===== 학교 주변 실거래 핀 =====
  // 카카오 좌표는 저장·캐시하지 않고 화면에 그릴 때만 실시간으로 조회한다 (카카오 정책).
  const geocoder = new kakao.maps.services.Geocoder(), places = new kakao.maps.services.Places();
  const kFind = (q, kw) => new Promise(res => { try { const done = (r, st) => res(st === kakao.maps.services.Status.OK && r && r[0] ? { lat: +r[0].y, lng: +r[0].x } : null); kw ? places.keywordSearch(q, done) : geocoder.addressSearch(q, done); } catch (e) { res(null); } });
  const dist = (a, b) => { const R = 6371, d = Math.PI / 180, x = (b.lng - a.lng) * d * Math.cos((a.lat + b.lat) / 2 * d), y = (b.lat - a.lat) * d; return R * Math.hypot(x, y); };
  const dmsg = document.createElement('div'); dmsg.id = 'udeal'; dmsg.className = 'hide'; document.getElementById('umapWrap').appendChild(dmsg);
  const setMsg = t => { dmsg.textContent = t || ''; dmsg.classList.toggle('hide', !t); };
  const addrCache = new Map();
  const loadAddr = c => { if (!addrCache.has(c)) addrCache.set(c, fetch('/data/addr/' + c + '.json').then(r => r.ok ? r.json() : null).catch(() => null)); return addrCache.get(c); };
  let dealOv = [], dealPop = null, dealGen = 0, picked = null;
  const clearDeals = () => { dealGen++; dealOv.forEach(o => o.setMap(null)); dealOv = []; if (dealPop) { dealPop.setMap(null); dealPop = null; } };
  const dd = v => { v = String(v).padStart(6, '0'); return v.slice(0, 2) + '.' + v.slice(2, 4) + '.' + v.slice(4); };
  const fl = f => f == null ? '-' : f < 0 ? '지하' : f;
  const TN = ['원룸·다가구', '빌라', '오피스텔', '아파트'];
  const escH = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function showDealPop(g, pos) {
    if (dealPop) dealPop.setMap(null);
    const el = document.createElement('div'); el.className = 'kpop';
    const rows = g.deals.slice(0, 6).map(r => '<div>' + dd(r[7]) + ' · ' + r[3].toLocaleString() + '/' + r[4] + '만 · ' + Math.round(r[2]) + '㎡ · ' + fl(r[5]) + '층' + (r[8] === 2 ? ' · 갱신' : '') + '</div>').join('');
    el.innerHTML = '<span class="x" aria-label="닫기">✕</span><b>' + escH(g.nm || (g.dong + ' ' + g.jb)) + '</b><div style="opacity:.65">' + escH(g.dong + ' ' + g.jb) + ' · ' + TN[g.deals[0][0]] + '</div>' + rows + (g.deals.length > 6 ? '<div style="opacity:.6">외 ' + (g.deals.length - 6) + '건</div>' : '');
    el.querySelector('.x').onclick = () => { dealPop.setMap(null); dealPop = null; };
    dealPop = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, clickable: true, zIndex: 30, map });
  }
  async function openSchool(k) {
    const o = byKey.get(k); if (!o) return;
    picked = k; clearDeals();
    const gen = dealGen, code = o.a.dataset.s, sc = { lat: o.pos.getLat(), lng: o.pos.getLng() };
    map.setLevel(4); map.panTo(o.pos);
    setMsg(o.name + ' 주변 실거래 찾는 중…');
    const d = await loadAddr(code);
    if (gen !== dealGen) return;
    if (!d) { setMsg(o.name + ': 이 지역은 주소가 있는 실거래 데이터가 아직 없어요.'); return; }
    // 1) 동 중심을 찾아 학교에서 가까운 동만 고른다
    const dongs = [...new Set(d.rows.map(r => r[1]))];
    const cen = await Promise.all(dongs.map(async i => ({ i, c: await kFind(d.name + ' ' + d.dongs[i]) })));
    if (gen !== dealGen) return;
    const near = cen.filter(x => x.c).map(x => ({ i: x.i, km: dist(sc, x.c) })).sort((a, b) => a.km - b.km).filter((x, n) => n < 3 || x.km < 1.5).slice(0, 5);
    const ok = new Set(near.map(x => x.i));
    // 2) 그 동의 월세 거래(소형, 빌라·오피스텔·아파트)를 건물별로 묶는다
    const groups = new Map(); let total = 0;
    for (const r of d.rows) {
      if (!ok.has(r[1]) || !r[9] || r[4] <= 0 || r[3] > 2000 || r[2] > 33 || r[8] === 2) continue;
      total++;
      const key = r[1] + '|' + r[9]; let g = groups.get(key);
      if (!g) groups.set(key, g = { dong: d.dongs[r[1]], jb: r[9], nm: r[10] >= 0 ? d.names[r[10]] : '', deals: [] });
      g.deals.push(r);
    }
    const list = [...groups.values()].sort((a, b) => b.deals[0][7] - a.deals[0][7]).slice(0, 80);
    if (!list.length) { setMsg(o.name + ' 주변에는 최근 3개월 소형 월세 실거래(주소 있는 것)가 없어요. 원룸·다가구는 지번이 공개되지 않아 지도에 못 그려요.'); return; }
    let i = 0, shown = 0;
    const work = async () => {
      while (i < list.length) {
        const g = list[i++];
        const c = (await kFind(d.name + ' ' + g.dong + ' ' + g.jb)) || (g.nm ? await kFind(d.name + ' ' + g.dong + ' ' + g.nm, 1) : null);
        if (gen !== dealGen) return;
        if (!c) continue;
        const pos = LL(c.lat, c.lng), d0 = g.deals[0];
        const el = document.createElement('div'); el.className = 'kdeal';
        el.innerHTML = d0[4] + '만' + (g.deals.length > 1 ? ' <small>외 ' + (g.deals.length - 1) + '</small>' : '');
        el.onclick = ev => { ev.stopPropagation(); lastDot = Date.now(); showDealPop(g, pos); };
        dealOv.push(new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, clickable: true, map })); shown++;
      }
    };
    await Promise.all(Array.from({ length: 6 }, work));
    if (gen !== dealGen) return;
    setMsg(shown ? o.name + ' 주변 최근 3개월 소형(33㎡ 이하) 월세 실거래 ' + total + '건 중 ' + shown + '곳. 숫자는 월세(만원)예요.' : '주소를 지도에서 찾지 못했어요.');
  }
  // 점을 누른 직후에 지도 클릭 이벤트가 따라와 말풍선을 바로 닫아 버리는 것을 막는다
  kakao.maps.event.addListener(map, 'click', () => { if (Date.now() - lastDot < 400) return; bov.setMap(null); if (dealPop) { dealPop.setMap(null); dealPop = null; } });
  if (!byKey.size) hint.textContent = '학교 위치를 아직 불러오지 못했어요. 아래 목록에서 학교를 골라 주세요.';
  document.getElementById('f').addEventListener('input', () => {
    const vis = links.filter(a => a.style.display !== 'none' && byKey.has(a.dataset.k));
    if (vis.length === 1) select(vis[0].dataset.k, true);
    else if (vis.length > 1 && vis.length < 12) { const b = new kakao.maps.LatLngBounds(); vis.forEach(a => b.extend(byKey.get(a.dataset.k).pos)); map.setBounds(b, 50, 50, 50, 50); }
  });
  kakao.maps.event.addListener(map, 'idle', layout); layout();
  matchMedia('(min-width:1024px)').addEventListener('change', () => setTimeout(() => map.relayout(), 80));
  setTimeout(() => map.relayout(), 100);
})();
