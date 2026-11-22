// 방문 기록 (쿠키 없음). 이 브라우저에서 하루에 처음 열었는지만 localStorage에 적는다.
// 주소에 ?nocount=1 을 붙여 한 번 열면 그 브라우저는 세지 않는다(내 방문 제외). ?nocount=0 으로 되돌린다.
(function () {
  try {
    var q = new URLSearchParams(location.search).get('nocount');
    if (q === '1') localStorage.setItem('ws-skip', '1');
    if (q === '0') localStorage.removeItem('ws-skip');
    var skip = /^(localhost|127\.|\[::1\])/.test(location.hostname) || navigator.doNotTrack === '1' || localStorage.getItem('ws-skip') === '1';
    var send = function (b) {
      fetch('/api/visits', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).catch(function () {});
    };
    // 매물 검증을 한 번 할 때마다 호출: wsgEvent('11110', 'wolse')
    window.wsgEvent = function (code, mode) { if (!skip) send({ k: 'check', l: code + '|' + mode }); };
    // 결과 공유: wsgShare('native'|'copy')
    window.wsgShare = function (how) { if (!skip) send({ k: 'share', l: how }); };
    if (skip) return;
    // 들어온 경로 (홍보 효과 확인용): 공유 링크(?r=), ?from=이름, 다른 사이트에서 온 경우 그 사이트 호스트만
    var sp = new URLSearchParams(location.search), ref = '';
    if (sp.get('r')) ref = 'share';
    else if (sp.get('from') || sp.get('utm_source')) ref = 'from:' + String(sp.get('from') || sp.get('utm_source')).toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 30);
    else if (document.referrer) { try { var h = new URL(document.referrer).hostname; if (h && h !== location.hostname) ref = h.replace(/^www\./, '').slice(0, 80); } catch (e) {} }
    if (ref && ref !== 'from:') send({ k: 'ref', l: ref });
    var day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    var path = location.pathname;
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem('ws-seen') || '{}'); } catch (e) {}
    if (seen.d !== day) seen = { d: day, p: [] };
    var ns = seen.p.length === 0 ? 1 : 0, np = seen.p.indexOf(path) < 0 ? 1 : 0;
    if (np) seen.p.push(path);
    localStorage.setItem('ws-seen', JSON.stringify(seen));
    send({ p: path, np: np, ns: ns });
  } catch (e) {}
})();
