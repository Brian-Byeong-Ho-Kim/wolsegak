// 학교 시세 페이지 지도: 첫 화면 지도와 같은 조작(크게 보기·실거래 끄기·내 위치·월세/반전세/전세·집 종류)과
// 같은 방식(지도를 옮기면 보이는 동네의 최근 12개월 실거래를 다시 그림)으로 동작한다.
// 카카오 좌표는 저장·캐시하지 않고 화면에 그릴 때만 실시간으로 조회한다 (카카오 정책).
(async () => {
  const KEY = '6c67906fb926c31e6e09524a74d819c6';
  const wrap = document.getElementById('umapWrap'), hint = document.getElementById('umapHint');
  if (!wrap) return;
  const { name, addr } = wrap.dataset;
  let lat = parseFloat(wrap.dataset.lat), lng = parseFloat(wrap.dataset.lng);
  wrap.classList.add('sm');
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
  const spos = LL(lat, lng);
  const map = new kakao.maps.Map(document.getElementById('umap'), { center: spos, level: 4 });
  map.setMaxLevel(14);
  new kakao.maps.CustomOverlay({ position: spos, content: '<div style="font-size:26px;line-height:1;transform:translateY(-4px)" title="' + name.replace(/"/g, '') + '">🎓</div>', yAnchor: 1, map });

  // ===== 조작 버튼 (첫 화면 지도와 같은 모양·위치) =====
  const mk = (tag, id, html, attrs) => { const e = document.createElement(tag); if (id) e.id = id; e.innerHTML = html || ''; Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); wrap.appendChild(e); return e; };
  const bFs = mk('button', 'mapFs', '⛶ 크게 보기', { type: 'button', 'aria-label': '지도 전체화면' });
  const bDeals = mk('button', 'mapDeals', '📍 실거래 끄기', { type: 'button', 'aria-pressed': 'true', 'aria-label': '실거래 핀 보기' });
  const bLoc = mk('button', 'mapLoc', '📍 내 위치', { type: 'button', 'aria-label': '내 위치 찾기' });
  const kinds = mk('div', 'dealKinds', '<button type="button" data-k="w" aria-pressed="true" title="보증금 5천만원 이하 월세">월세</button><button type="button" data-k="b" aria-pressed="true" title="보증금 5천만원 초과 월세(반전세)">반전세</button><button type="button" data-k="j" aria-pressed="false" title="월세 없는 전세">전세</button>', { role: 'group', 'aria-label': '거래 종류' });
  const typesEl = mk('div', 'dealTypes', '<button type="button" data-t="0" aria-pressed="true" title="원룸·다가구 (지번 없어 핀은 거의 없어요)">원룸</button><button type="button" data-t="1" aria-pressed="true">빌라</button><button type="button" data-t="2" aria-pressed="true">오피스텔</button><button type="button" data-t="3" aria-pressed="false">아파트</button>', { role: 'group', 'aria-label': '집 종류' });
  const msgEl = mk('div', 'dealMsg', '', {}); msgEl.classList.add('hide');
  const dealMsg = t => { msgEl.textContent = t || ''; msgEl.classList.toggle('hide', !t); };

  const dealKinds = new Set(['w', 'b']), pinTypes = new Set([0, 1, 2]);
  const kindOf = r => r[4] <= 0 ? 'j' : r[3] > 5000 ? 'b' : 'w';
  let dealOn = true;
  const eok = m => m >= 10000 ? Math.floor(m / 10000) + '억' + (m % 10000 ? ' ' + (m % 10000).toLocaleString() : '') : m.toLocaleString() + '만';
  const dd = v => { v = String(v).padStart(6, '0'); return v.slice(0, 2) + '.' + v.slice(2, 4) + '.' + v.slice(4); };
  const fl = f => f == null ? '-' : f < 0 ? '지하' : f;
  const TN = ['원룸·다가구', '빌라', '오피스텔', '아파트'];
  const escH = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let B = null; try { const b = JSON.parse(localStorage.getItem('wsg:budget') || 'null'); if (b && b.rent > 0) B = b; } catch (e) {}

  // 지도 중심의 시·군·구 찾기 (옮기다 다른 시군구로 넘어가도 이어서 보이도록)
  const SIDO_SHORT = { 서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 충청북도: '충북', 충청남도: '충남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주', 강원특별자치도: '강원', 전북특별자치도: '전북', 전남광주통합특별시: '전남광주' };
  const SIDO_LONG = Object.fromEntries(Object.entries(SIDO_SHORT).map(([l, sh]) => [sh, l]));
  Object.assign(SIDO_LONG, { 광주: '전남광주통합특별시', 전남: '전남광주통합특별시', 광주광역시: '전남광주통합특별시', 전라남도: '전남광주통합특별시', 강원도: '강원특별자치도', 전라북도: '전북특별자치도', 제주도: '제주특별자치도' });
  const SIDO_ALIAS = { 광주광역시: '전남광주통합특별시', 전라남도: '전남광주통합특별시' };
  let INDEX = null; fetch('/data/index.json').then(r => r.json()).then(j => { INDEX = j; }).catch(() => {});
  const kRegion = (la, ln) => new Promise(res => { try { geocoder.coord2RegionCode(ln, la, (r, st) => { if (st !== kakao.maps.services.Status.OK || !r || !r.length) return res(null); const parts = []; for (const x of r) for (const k of ['region_1depth_name', 'region_2depth_name', 'region_3depth_name']) (x[k] || '').split(/\s+/).filter(Boolean).forEach(t => parts.push(SIDO_LONG[t] || t)); res(parts); }); } catch (e) { res(null); } });
  const matchSgg = parts => {
    if (!INDEX) return null;
    const P = new Set(parts.map(p => SIDO_ALIAS[p] || p)); let best = null, bestN = 0;
    for (const s of INDEX.sgg) { const [sd, ...rest] = s.name.split(' '); if (!P.has(sd)) continue; if (!rest.length) { if (bestN < 1) { best = s.code; bestN = 1; } continue; } if (rest.every(t => P.has(t)) && rest.length + 1 > bestN) { best = s.code; bestN = rest.length + 1; } }
    if (best && bestN > 1) return best;
    for (const [code, dongs] of Object.entries(INDEX.split || {})) if (dongs.some(d => P.has(d) || P.has(d + '동'))) return code;
    return best;
  };
  const pool = async (items, fn, n) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); };
  const addrCache = new Map();
  const loadAddr = code => { if (!addrCache.has(code)) addrCache.set(code, fetch('/data/addr/' + code + '.json').then(r => r.ok ? r.json() : null).catch(() => null)); return addrCache.get(code); };

  // ===== 실거래 핀 =====
  let dealShown = new Map(), dealCode = null, dongPos = null, dealGen = 0, dealPop = null, lastPin = 0, dealT;
  const hideDeals = () => { dealShown.forEach(v => v.ov.setMap(null)); dealShown.clear(); if (dealPop) { dealPop.setMap(null); dealPop = null; } };
  const clearDeals = () => { dealGen++; hideDeals(); dealCode = null; dongPos = null; };
  const refreshDeals = () => { clearTimeout(dealT); dealT = setTimeout(drawDeals, 450); };
  function showDealPop(g, pos) {
    if (dealPop) dealPop.setMap(null);
    const el = document.createElement('div'); el.className = 'kpop';
    const rows = g.deals.map(r => '<div>' + dd(r[7]) + ' · ' + (r[4] <= 0 ? '전세 ' + eok(r[3]) : r[3].toLocaleString() + '/' + r[4] + '만') + ' · ' + Math.round(r[2]) + '㎡ · ' + fl(r[5]) + '층' + (r[8] === 2 ? ' · 갱신' : '') + '</div>').join('');
    el.innerHTML = '<span class="x" aria-label="닫기">✕</span><b>' + escH(g.nm || (g.dong + ' ' + g.jb)) + '</b><div style="opacity:.65">' + escH(g.dong + ' ' + g.jb) + ' · ' + TN[g.deals[0][0]] + '</div>' + rows;
    el.querySelector('.x').onclick = () => { dealPop.setMap(null); dealPop = null; };
    dealPop = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, clickable: true, zIndex: 10, map });
  }
  async function drawDeals() {
    if (!dealOn) { clearDeals(); dealMsg(''); return; }
    const gen = ++dealGen;
    if (map.getLevel() > 6) { hideDeals(); dealMsg('지도를 동네 단위로 확대하면 실거래가 보여요.'); return; }
    const bounds = map.getBounds(), ctr = map.getCenter(), sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
    const padLat = (ne.getLat() - sw.getLat()) * 0.15, padLng = (ne.getLng() - sw.getLng()) * 0.15;
    const inView = (c, k = 1) => c.lat >= sw.getLat() - padLat * k && c.lat <= ne.getLat() + padLat * k && c.lng >= sw.getLng() - padLng * k && c.lng <= ne.getLng() + padLng * k;
    if (!INDEX) await new Promise(r => setTimeout(r, 600));
    const parts = await kRegion(ctr.getLat(), ctr.getLng());
    if (gen !== dealGen) return;
    const code = (parts && matchSgg(parts)) || wrap.dataset.s || null;
    if (!code) { hideDeals(); dealMsg('이 위치의 시·군·구를 찾지 못했어요.'); return; }
    const d = await loadAddr(code);
    if (gen !== dealGen) return;
    if (!d) { hideDeals(); dealMsg('이 지역은 주소가 있는 실거래 데이터가 아직 없어요.'); return; }
    if (dealCode !== code) { hideDeals(); dongPos = null; dealCode = code; }
    if (!dongPos) {
      dealMsg('동네 위치 찾는 중…');
      const idx = [...new Set(d.rows.map(r => r[1]))], got = [];
      await pool(idx, async i => { const c = await kFind(d.name + ' ' + d.dongs[i]); if (c) got.push([i, c]); }, 8);
      if (gen !== dealGen) return;
      dongPos = new Map(got);
    }
    const dk = new Map([...dongPos].map(([i, c]) => [i, Math.hypot((c.lng - ctr.getLng()) * Math.cos(ctr.getLat() * Math.PI / 180), c.lat - ctr.getLat())]));
    const okDong = new Set([...dongPos].filter(([, c]) => inView(c, 2)).map(([i]) => i));
    [...dk].sort((x, y) => x[1] - y[1]).slice(0, 3).forEach(([i]) => okDong.add(i));   // 많이 확대해도 가까운 동 3곳은 포함
    const groups = new Map(); let total = 0;
    for (const r of d.rows) {
      if (!okDong.has(r[1]) || !r[9] || !pinTypes.has(r[0]) || r[2] > 60 || !dealKinds.has(kindOf(r))) continue;
      total++;
      const key = r[1] + '|' + r[9]; let g = groups.get(key);
      if (!g) groups.set(key, g = { key, dong: d.dongs[r[1]], jb: r[9], nm: r[10] >= 0 ? d.names[r[10]] : '', sgg: d.name, dk: dk.get(r[1]) || 0, deals: [] });
      g.deals.push(r);
    }
    const cap = map.getLevel() <= 2 ? 500 : map.getLevel() <= 3 ? 350 : 150;
    const list = [...groups.values()].sort((a, b) => a.dk - b.dk || b.deals[0][7] - a.deals[0][7]).slice(0, cap);
    const want = new Set(list.map(g => g.key));
    for (const [k, v] of [...dealShown]) if (!want.has(k) || !inView(v.pos, 1)) { v.ov.setMap(null); dealShown.delete(k); }
    const style = (el, d0) => { const jn = d0[4] <= 0, ok = B ? (jn ? d0[3] <= B.dep : (d0[3] <= B.dep && d0[4] <= B.rent)) : null; el.className = 'kdeal' + (jn ? ' jn' : d0[3] > 5000 ? ' bj' : '') + (ok === true ? ' ok' : ok === false ? ' no' : ''); };
    for (const v of dealShown.values()) style(v.el, v.g.deals[0]);
    const todo = list.filter(g => !dealShown.has(g.key));
    if (!list.length) { dealMsg('이 화면에는 조건에 맞는 최근 실거래(주소 있는 것)가 없어요. 원룸·다가구는 지번이 없어 지도에 못 그려요.'); return; }
    dealMsg(todo.length ? '실거래 불러오는 중…' : '');
    await pool(todo, async g => {
      if (gen !== dealGen) return;
      const c = (await kFind(g.sgg + ' ' + g.dong + ' ' + g.jb)) || (g.nm ? await kFind(g.sgg + ' ' + g.dong + ' ' + g.nm, 1) : null);
      if (gen !== dealGen || !c || !inView(c, 1)) return;
      const d0 = g.deals[0], jn = d0[4] <= 0, el = document.createElement('div'), pos = LL(c.lat, c.lng);
      style(el, d0);
      el.innerHTML = (jn ? '전세 ' + eok(d0[3]) : d0[3] > 5000 ? '반 ' + eok(d0[3]) + '/' + d0[4] : d0[4] + '만') + (g.deals.length > 1 ? ' <small>외 ' + (g.deals.length - 1) + '</small>' : '');
      el.onclick = ev => { ev.stopPropagation(); lastPin = Date.now(); showDealPop(g, pos); };
      dealShown.set(g.key, { ov: new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, clickable: true, map }), el, g, pos: c });
    }, 6);
    if (gen !== dealGen) return;
    dealMsg(dealShown.size ? '이 화면의 최근 12개월 실거래(전용 60㎡ 이하) ' + total.toLocaleString() + '건 중 ' + dealShown.size + '곳. 지도를 옮기면 새로 보여 드려요.' : '주소를 지도에서 찾지 못했어요.');
  }
  kakao.maps.event.addListener(map, 'idle', refreshDeals);
  kakao.maps.event.addListener(map, 'click', () => { if (Date.now() - lastPin < 400) return; if (dealPop) { dealPop.setMap(null); dealPop = null; } });
  kinds.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k; if (dealKinds.has(k)) { if (dealKinds.size === 1) return; dealKinds.delete(k); } else dealKinds.add(k); b.setAttribute('aria-pressed', dealKinds.has(k)); drawDeals(); });
  typesEl.addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (!b) return; const t = +b.dataset.t; if (pinTypes.has(t)) { if (pinTypes.size === 1) return; pinTypes.delete(t); } else pinTypes.add(t); b.setAttribute('aria-pressed', pinTypes.has(t)); drawDeals(); });
  bDeals.onclick = () => {
    dealOn = !dealOn; kinds.classList.toggle('hide', !dealOn); typesEl.classList.toggle('hide', !dealOn);
    bDeals.setAttribute('aria-pressed', dealOn); bDeals.textContent = dealOn ? '📍 실거래 끄기' : '📍 실거래 보기';
    drawDeals();
  };
  // 크게 보기
  bFs.onclick = () => {
    const on = !wrap.classList.contains('fs');
    wrap.classList.toggle('fs', on); document.body.classList.toggle('mapfs', on);
    bFs.textContent = on ? '✕ 닫기' : '⛶ 크게 보기'; bFs.setAttribute('aria-label', on ? '전체화면 닫기' : '지도 전체화면');
    setTimeout(() => { map.relayout(); map.setCenter(map.getCenter()); }, 60);
  };
  // 내 위치 (위치는 서버로 보내거나 저장하지 않는다)
  let me = null;
  bLoc.onclick = () => {
    if (!navigator.geolocation) { hint.textContent = '이 브라우저는 위치 찾기를 지원하지 않아요.'; return; }
    bLoc.disabled = true; bLoc.textContent = '📍 찾는 중…';
    navigator.geolocation.getCurrentPosition(p => {
      bLoc.disabled = false; bLoc.textContent = '📍 내 위치';
      const pos = LL(p.coords.latitude, p.coords.longitude);
      if (me) me.setMap(null);
      me = new kakao.maps.CustomOverlay({ position: pos, content: '<div class="medot" title="내 위치"></div>', xAnchor: .5, yAnchor: .5, zIndex: 8, map });
      map.setLevel(4); map.setCenter(pos);
    }, e => { bLoc.disabled = false; bLoc.textContent = '📍 내 위치'; hint.textContent = e && e.code === 1 ? '위치 권한이 꺼져 있어요. 브라우저 주소창의 위치 설정에서 허용해 주세요.' : '내 위치를 찾지 못했어요. 잠시 뒤 다시 눌러 보세요.'; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  setTimeout(() => map.relayout(), 100);
  matchMedia('(min-width:1024px)').addEventListener('change', () => setTimeout(() => { map.relayout(); map.setCenter(spos); }, 80));
  drawDeals();
})();
