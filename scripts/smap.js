// 학교 시세 페이지: 오른쪽(모바일은 위) 지도에 그 학교 주변 최근 3개월 실거래를 핀으로 보여 준다.
// 카카오 좌표는 저장·캐시하지 않고 화면에 그릴 때만 실시간으로 조회한다 (카카오 정책).
(async () => {
  const KEY = '6c67906fb926c31e6e09524a74d819c6';
  const wrap = document.getElementById('umapWrap'), hint = document.getElementById('umapHint');
  if (!wrap) return;
  const { name, s: code, addr } = wrap.dataset;
  let lat = parseFloat(wrap.dataset.lat), lng = parseFloat(wrap.dataset.lng);
  try {
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KEY + '&autoload=false&libraries=services';
      sc.onload = () => kakao.maps.load(res); sc.onerror = rej; document.head.appendChild(sc);
    });
  } catch (e) { hint.textContent = '지도를 불러오지 못했어요.'; return; }
  const LL = (a, b) => new kakao.maps.LatLng(a, b);
  const geocoder = new kakao.maps.services.Geocoder(), places = new kakao.maps.services.Places();
  const kFind = (q, kw) => new Promise(res => { try { const done = (r, st) => res(st === kakao.maps.services.Status.OK && r && r[0] ? { lat: +r[0].y, lng: +r[0].x } : null); kw ? places.keywordSearch(q, done) : geocoder.addressSearch(q, done); } catch (e) { res(null); } });
  if (!isFinite(lat) || !isFinite(lng)) {
    const c = (await kFind((addr || '').replace(/\s*\(.*\)$/, ''))) || (await kFind(name, 1));
    if (!c) { hint.textContent = '학교 위치를 찾지 못했어요.'; return; }
    lat = c.lat; lng = c.lng;
  }
  const sc0 = { lat, lng }, spos = LL(lat, lng);
  const map = new kakao.maps.Map(document.getElementById('umap'), { center: spos, level: 4 });
  new kakao.maps.CustomOverlay({ position: spos, content: '<div style="font-size:26px;line-height:1;transform:translateY(-4px)" title="' + name.replace(/"/g, '') + '">🎓</div>', yAnchor: 1, map });
  const msgEl = document.createElement('div'); msgEl.id = 'udeal'; wrap.appendChild(msgEl);
  // 월세 / 반전세 / 전세 보기 선택 (전세는 기본 꺼짐)
  const kinds = new Set(['w', 'b']), pins = [];
  const kindOf = r => r[4] <= 0 ? 'j' : r[3] > 5000 ? 'b' : 'w';
  const kb = document.createElement('div'); kb.id = 'dealKinds'; kb.setAttribute('role', 'group'); kb.setAttribute('aria-label', '거래 종류');
  kb.innerHTML = '<button type="button" data-k="w" aria-pressed="true" title="보증금 5천만원 이하 월세">월세</button><button type="button" data-k="b" aria-pressed="true" title="보증금 5천만원 초과 월세(반전세)">반전세</button><button type="button" data-k="j" aria-pressed="false" title="월세 없는 전세">전세</button>';
  wrap.appendChild(kb);
  const paint = g => { const a = g.deals.filter(r => kinds.has(kindOf(r))), x = a.length ? a : g.deals, d0 = x[0]; g.el.className = 'kdeal' + (d0[4] <= 0 ? ' jn' : ''); g.el.innerHTML = (d0[4] <= 0 ? '전세 ' + eok(d0[3]) : d0[4] + '만') + (x.length > 1 ? ' <small>외 ' + (x.length - 1) + '</small>' : ''); };
  const applyKinds = () => { for (const p of pins) { paint(p.g); const on = p.g.deals.some(r => kinds.has(kindOf(r))); p.ov.setMap(on ? map : null); if (!on && pop && pop.__g === p.g) { pop.setMap(null); pop = null; } } };
  kb.addEventListener('click', e => {
    const bt = e.target.closest('button'); if (!bt) return; const k = bt.dataset.k;
    if (kinds.has(k)) { if (kinds.size === 1) return; kinds.delete(k); } else kinds.add(k);
    bt.setAttribute('aria-pressed', kinds.has(k)); applyKinds();
  });
  const setMsg = t => { msgEl.textContent = t || ''; msgEl.classList.toggle('hide', !t); };
  const dist = (a, b) => { const d = Math.PI / 180, x = (b.lng - a.lng) * d * Math.cos((a.lat + b.lat) / 2 * d), y = (b.lat - a.lat) * d; return 6371 * Math.hypot(x, y); };
  const dd = v => { v = String(v).padStart(6, '0'); return v.slice(0, 2) + '.' + v.slice(2, 4) + '.' + v.slice(4); };
  const eok = m => m >= 10000 ? Math.floor(m / 10000) + '억' + (m % 10000 ? ' ' + (m % 10000).toLocaleString() : '') : m.toLocaleString() + '만';
  const fl = f => f == null ? '-' : f < 0 ? '지하' : f;
  const TN = ['원룸·다가구', '빌라', '오피스텔', '아파트'];
  const escH = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let pop = null;
  const gd = g => { const a = g.deals.filter(r => kinds.has(kindOf(r))); return a.length ? a : g.deals; };
  const showPop = (g, pos) => {
    if (pop) pop.setMap(null);
    const el = document.createElement('div'); el.className = 'kpop';
    const rows = gd(g).slice(0, 6).map(r => '<div>' + dd(r[7]) + ' · ' + (r[4] <= 0 ? '전세 ' + eok(r[3]) : r[3].toLocaleString() + '/' + r[4] + '만') + ' · ' + Math.round(r[2]) + '㎡ · ' + fl(r[5]) + '층' + (r[8] === 2 ? ' · 갱신' : '') + '</div>').join('');
    el.innerHTML = '<span class="x" aria-label="닫기">✕</span><b>' + escH(g.nm || (g.dong + ' ' + g.jb)) + '</b><div style="opacity:.65">' + escH(g.dong + ' ' + g.jb) + ' · ' + TN[gd(g)[0][0]] + '</div>' + rows + (gd(g).length > 6 ? '<div style="opacity:.6">외 ' + (gd(g).length - 6) + '건</div>' : '');
    el.querySelector('.x').onclick = () => { pop.setMap(null); pop = null; };
    pop = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, clickable: true, zIndex: 30, map }); pop.__g = g;
  };
  let lastPin = 0;
  kakao.maps.event.addListener(map, 'click', () => { if (Date.now() - lastPin < 400) return; if (pop) { pop.setMap(null); pop = null; } });

  // 내 위치 찾기 (위치는 서버로 보내거나 저장하지 않는다)
  {
    const wrapEl = document.getElementById('umapWrap'), b = document.createElement('button');
    b.type = 'button'; b.id = 'uLoc'; b.textContent = '📍 내 위치'; wrapEl.appendChild(b);
    let me = null;
    b.onclick = () => {
      if (!navigator.geolocation) { hint.textContent = '이 브라우저는 위치 찾기를 지원하지 않아요.'; return; }
      b.disabled = true; b.textContent = '📍 찾는 중…';
      navigator.geolocation.getCurrentPosition(p => {
        b.disabled = false; b.textContent = '📍 내 위치';
        const pos = new kakao.maps.LatLng(p.coords.latitude, p.coords.longitude);
        if (me) me.setMap(null);
        me = new kakao.maps.CustomOverlay({ position: pos, content: '<div class="medot" title="내 위치"></div>', xAnchor: .5, yAnchor: .5, zIndex: 8, map });
        map.setLevel(5); map.panTo(pos);
      }, e => { b.disabled = false; b.textContent = '📍 내 위치'; hint.textContent = e && e.code === 1 ? '위치 권한이 꺼져 있어요. 브라우저 주소창의 위치 설정에서 허용해 주세요.' : '내 위치를 찾지 못했어요.'; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    };
  }
  setTimeout(() => map.relayout(), 100);
  matchMedia('(min-width:1024px)').addEventListener('change', () => setTimeout(() => { map.relayout(); map.setCenter(spos); }, 80));

  setMsg(name + ' 주변 실거래 찾는 중…');
  const d = await fetch('/data/addr/' + code + '.json').then(r => r.ok ? r.json() : null).catch(() => null);
  if (!d) { setMsg('이 지역은 주소가 있는 실거래 데이터가 아직 없어요.'); return; }
  const dongs = [...new Set(d.rows.map(r => r[1]))];
  const cen = await Promise.all(dongs.map(async i => ({ i, c: await kFind(d.name + ' ' + d.dongs[i]) })));
  const near = cen.filter(x => x.c).map(x => ({ i: x.i, km: dist(sc0, x.c) })).sort((a, b) => a.km - b.km).filter((x, n) => n < 3 || x.km < 1.5).slice(0, 5);
  const ok = new Set(near.map(x => x.i));
  const groups = new Map(); let total = 0;
  for (const r of d.rows) {
    if (!ok.has(r[1]) || !r[9] || r[2] > 60) continue;
    total++;
    const key = r[1] + '|' + r[9]; let g = groups.get(key);
    if (!g) groups.set(key, g = { dong: d.dongs[r[1]], jb: r[9], nm: r[10] >= 0 ? d.names[r[10]] : '', deals: [] });
    g.deals.push(r);
  }
  const list = [...groups.values()].sort((a, b) => b.deals[0][7] - a.deals[0][7]).slice(0, 120);
  if (!list.length) { setMsg('주변에 최근 12개월 실거래(주소 있는 것)가 없어요. 원룸·다가구는 지번이 공개되지 않아 지도에 못 그려요.'); return; }
  let i = 0, shown = 0;
  const work = async () => {
    while (i < list.length) {
      const g = list[i++];
      const c = (await kFind(d.name + ' ' + g.dong + ' ' + g.jb)) || (g.nm ? await kFind(d.name + ' ' + g.dong + ' ' + g.nm, 1) : null);
      if (!c) continue;
      const pos = LL(c.lat, c.lng), d0 = g.deals[0];
      const el = document.createElement('div'); g.el = el; paint(g);
      el.onclick = ev => { ev.stopPropagation(); lastPin = Date.now(); showPop(g, pos); };
      const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, clickable: true, map: g.deals.some(r => kinds.has(kindOf(r))) ? map : null }); pins.push({ g, ov }); shown++;
    }
  };
  await Promise.all(Array.from({ length: 6 }, work));
  setMsg(shown ? '최근 12개월 실거래(월세·전세, 전용 60㎡ 이하) ' + total + '건 중 ' + shown + '곳. 숫자는 월세(만원), 점선 \'전세\'는 전세금이에요. 눌러서 자세히 보세요.' : '주소를 지도에서 찾지 못했어요.');
})();
