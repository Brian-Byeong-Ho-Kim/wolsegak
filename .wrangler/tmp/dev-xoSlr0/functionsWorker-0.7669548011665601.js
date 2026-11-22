var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-Q4JTKX/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// .wrangler/tmp/pages-UnvvW0/functionsWorker-0.7669548011665601.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
__name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader2.apply(null, argArray)
    ]);
  }
});
var ALLOW = [/(^|\.)zigbang\.com$/, /(^|\.)dabangapp\.com$/, /(^|\.)land\.naver\.com$/, /^naver\.me$/, /(^|\.)peterpanz\.com$/];
var json = /* @__PURE__ */ __name2((body, status = 200, ttl = 0) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": ttl ? `public, max-age=${ttl}` : "no-store" }
}), "json");
var pick = /* @__PURE__ */ __name2((html, re) => {
  const m = html.match(re);
  return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : null;
}, "pick");
async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get("url") || "";
  let target;
  try {
    target = new URL(u);
  } catch {
    return json({ error: "\uB9C1\uD06C \uD615\uC2DD\uC774 \uC544\uB2C8\uC5D0\uC694" }, 400);
  }
  if (!/^https?:$/.test(target.protocol) || !ALLOW.some((r) => r.test(target.hostname)))
    return json({ error: "\uC9C1\uBC29\xB7\uB2E4\uBC29\xB7\uB124\uC774\uBC84\uBD80\uB3D9\uC0B0\xB7\uD53C\uD130\uD32C \uB9C1\uD06C\uB9CC \uC77D\uC744 \uC218 \uC788\uC5B4\uC694" }, 400);
  const cache = caches.default, key = new Request("https://wolsegak.com/api/preview?u=" + encodeURIComponent(target.href));
  const hit = await cache.match(key);
  if (hit)
    return hit;
  let html = "", finalUrl = target.href;
  try {
    let res, url = target.href;
    for (let i = 0; i < 5; i++) {
      res = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; wolsegak-linkpreview/1.0; +https://wolsegak.com)", accept: "text/html" }, cf: { cacheTtl: 3600 } });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, url);
        if (!ALLOW.some((r) => r.test(next.hostname)))
          return json({ error: "\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uC8FC\uC18C\uB85C \uC774\uB3D9\uD558\uB294 \uB9C1\uD06C\uC608\uC694" }, 400);
        url = next.href;
        continue;
      }
      break;
    }
    finalUrl = url;
    if (!res.ok)
      return json({ error: `\uBBF8\uB9AC\uBCF4\uAE30\uB97C \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694 (${res.status})` }, 502);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let got = 0;
    while (got < 3e5) {
      const { done, value } = await reader.read();
      if (done)
        break;
      got += value.length;
      html += dec.decode(value, { stream: true });
      if (html.includes("</head>"))
        break;
    }
    reader.cancel().catch(() => {
    });
  } catch (e) {
    return json({ error: "\uBBF8\uB9AC\uBCF4\uAE30\uB97C \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694" }, 502);
  }
  const out = {
    url: finalUrl,
    title: pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || pick(html, /<title>([^<]*)<\/title>/i),
    description: pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
  };
  const resp = json(out, 200, 86400);
  await cache.put(key, resp.clone());
  return resp;
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
var json2 = /* @__PURE__ */ __name2((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }), "json");
var PATH = /^\/[A-Za-z0-9\-_.~%\/]{0,240}$/;
var SKIP = /^\/(api|stats|data)(\/|$)/;
var LABEL = /^[0-9]{5}\|(wolse|jeonse)$/;
var SHARE = /^(native|copy)$/;
var REF = /^(share|from:[a-z0-9_\-]{1,30}|[a-z0-9.\-]{1,80})$/;
var BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor/i;
var kst = /* @__PURE__ */ __name2((offset = 0) => new Date(Date.now() + 9 * 36e5 - offset * 864e5).toISOString().slice(0, 10), "kst");
async function db(env) {
  const d = env.STATS_DB || env.LIKES_DB;
  if (!d)
    return null;
  await d.batch([
    d.prepare("CREATE TABLE IF NOT EXISTS wsg_visits (day TEXT NOT NULL, path TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, uniques INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, path))"),
    d.prepare("CREATE TABLE IF NOT EXISTS wsg_events (day TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, label))")
  ]);
  return d;
}
__name(db, "db");
__name2(db, "db");
async function onRequestPost({ request, env }) {
  const d = await db(env);
  if (!d)
    return json2({ error: "not configured" }, 503);
  if (BOT.test(request.headers.get("user-agent") || ""))
    return new Response(null, { status: 204 });
  let body;
  try {
    body = await request.json();
  } catch {
    return json2({ error: "bad request" }, 400);
  }
  const day = kst();
  if (body?.k === "check") {
    const l = String(body.l || "");
    if (!LABEL.test(l))
      return new Response(null, { status: 204 });
    await d.prepare("INSERT INTO wsg_events (day, kind, label, n) VALUES (?, 'check', ?, 1) ON CONFLICT(day, kind, label) DO UPDATE SET n = n + 1").bind(day, l).run();
    return new Response(null, { status: 204 });
  }
  if (body?.k === "share" || body?.k === "ref") {
    const l = String(body.l || "").toLowerCase();
    if (!(body.k === "share" ? SHARE : REF).test(l))
      return new Response(null, { status: 204 });
    await d.prepare("INSERT INTO wsg_events (day, kind, label, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, kind, label) DO UPDATE SET n = n + 1").bind(day, body.k, l).run();
    return new Response(null, { status: 204 });
  }
  let p = String(body?.p || "").split(/[?#]/)[0];
  if (!PATH.test(p) || SKIP.test(p))
    return new Response(null, { status: 204 });
  const sql = "INSERT INTO wsg_visits (day, path, views, uniques) VALUES (?, ?, 1, ?) ON CONFLICT(day, path) DO UPDATE SET views = views + 1, uniques = uniques + excluded.uniques";
  await d.batch([d.prepare(sql).bind(day, p, body?.np ? 1 : 0), d.prepare(sql).bind(day, "*", body?.ns ? 1 : 0)]);
  return new Response(null, { status: 204 });
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequestGet2({ env }) {
  const d = await db(env);
  if (!d)
    return json2({ error: "not configured" }, 503);
  const sum = /* @__PURE__ */ __name2(async (from, to) => {
    const r = await d.prepare("SELECT COALESCE(SUM(views),0) v, COALESCE(SUM(uniques),0) u FROM wsg_visits WHERE path = '*' AND day >= ? AND day <= ?").bind(from, to).first();
    return { views: r.v, uniques: r.u };
  }, "sum");
  const chk = /* @__PURE__ */ __name2(async (from, to) => (await d.prepare("SELECT COALESCE(SUM(n),0) n FROM wsg_events WHERE kind = 'check' AND day >= ? AND day <= ?").bind(from, to).first()).n, "chk");
  const from30 = kst(29), t = kst();
  const [today, yesterday, d7, d30, all] = await Promise.all([sum(t, t), sum(kst(1), kst(1)), sum(kst(6), t), sum(from30, t), sum("0000-00-00", "9999-99-99")]);
  const [cToday, c7, c30, cAll] = await Promise.all([chk(t, t), chk(kst(6), t), chk(from30, t), chk("0000-00-00", "9999-99-99")]);
  const { results: daily } = await d.prepare("SELECT day, views, uniques FROM wsg_visits WHERE path = '*' AND day >= ? ORDER BY day").bind(from30).all();
  const { results: checksDaily } = await d.prepare("SELECT day, SUM(n) n FROM wsg_events WHERE kind = 'check' AND day >= ? GROUP BY day ORDER BY day").bind(from30).all();
  const { results: topPlaces } = await d.prepare("SELECT label, SUM(n) n FROM wsg_events WHERE kind = 'check' AND day >= ? GROUP BY label ORDER BY n DESC LIMIT 20").bind(from30).all();
  const ev = /* @__PURE__ */ __name2(async (kind, from, to) => (await d.prepare("SELECT COALESCE(SUM(n),0) n FROM wsg_events WHERE kind = ? AND day >= ? AND day <= ?").bind(kind, from, to).first()).n, "ev");
  const [sToday, s7, s30, sAll] = await Promise.all([ev("share", t, t), ev("share", kst(6), t), ev("share", from30, t), ev("share", "0000-00-00", "9999-99-99")]);
  const { results: topRefs } = await d.prepare("SELECT label, SUM(n) n FROM wsg_events WHERE kind = 'ref' AND day >= ? GROUP BY label ORDER BY n DESC LIMIT 20").bind(from30).all();
  return json2({ today, yesterday, d7, d30, all, checks: { today: cToday, d7: c7, d30: c30, all: cAll }, shares: { today: sToday, d7: s7, d30: s30, all: sAll }, daily, checksDaily, topPlaces, topRefs, today_day: t });
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
var VERDICT = {
  good: "\uC774 \uBC29, \uC2DC\uC138\uBCF4\uB2E4 \uC2FC \uD3B8\uC774\uB798\uC694",
  ok: "\uC774 \uBC29, \uC2DC\uC138\uC5D0 \uB9DE\uB294 \uC801\uC815\uD55C \uD3B8\uC774\uB798\uC694",
  warn: "\uC774 \uBC29, \uC2DC\uC138\uBCF4\uB2E4 \uC870\uAE08 \uBE44\uC2FC \uD3B8\uC774\uB798\uC694",
  bad: "\uC774 \uBC29, \uC2DC\uC138\uBCF4\uB2E4 \uBE44\uC2FC \uD3B8\uC774\uB798\uC694",
  bait: "\uC2DC\uC138\uBCF4\uB2E4 \uB108\uBB34 \uC2F8\uC694 \u2014 \uBBF8\uB07C\uB9E4\uBB3C \uC8FC\uC758"
};
var comma = /* @__PURE__ */ __name2((n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","), "comma");
var won = /* @__PURE__ */ __name2((m) => m >= 1e4 ? `${Math.floor(m / 1e4)}\uC5B5${m % 1e4 ? " " + comma(m % 1e4) : ""}\uB9CC\uC6D0` : `${comma(m)}\uB9CC\uC6D0`, "won");
async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const r = url.searchParams.get("r");
  if (url.pathname !== "/" || !Object.hasOwn(VERDICT, r || ""))
    return ctx.next();
  const res = await ctx.next();
  if (!(res.headers.get("content-type") || "").includes("text/html"))
    return res;
  const num = /* @__PURE__ */ __name2((k) => {
    const v = Math.round(Number(url.searchParams.get(k)));
    return url.searchParams.has(k) && Number.isFinite(v) && v >= 0 && v < 1e7 ? v : null;
  }, "num");
  const w = (url.searchParams.get("w") || "").replace(/[<>"'&`\u0000-\u001f]/g, "").trim().slice(0, 40);
  const dep = num("dep"), rent = num("rent"), pc = num("pc"), n = num("n");
  const jeonse = url.searchParams.get("m") === "jeonse";
  const price = dep == null ? "" : jeonse ? `\uC804\uC138 ${won(dep)}` : rent != null ? `\uBCF4\uC99D\uAE08 ${won(dep)} / \uC6D4\uC138 ${comma(rent)}\uB9CC\uC6D0` : "";
  const pos = r === "bait" || pc == null || pc > 100 ? "" : pc <= 50 ? ` \uC911 \uC2FC \uCABD ${Math.max(1, pc)}%` : ` \uC911 \uBE44\uC2FC \uCABD ${Math.max(1, 100 - pc)}%`;
  const title = `${VERDICT[r]} | \uC6D4\uC138\uAC01`;
  const desc = [[w, price].filter(Boolean).join(" \xB7 "), n ? `\uAC19\uC740 \uB3D9\uB124 \uBE44\uC2B7\uD55C \uC9D1 \uC2E4\uAC70\uB798 ${comma(n)}\uAC74${pos}` : "", "\uB0B4\uAC00 \uBCF8 \uBC29\uB3C4 30\uCD08\uBA74 \uD655\uC778\uD574\uC694."].filter(Boolean).join(" \u2014 ");
  const img = `${url.origin}/og/${r}.png`;
  const set = /* @__PURE__ */ __name2((v) => ({ element(e) {
    e.setAttribute("content", v);
  } }), "set");
  return new HTMLRewriter().on("head > title", { element(e) {
    e.setInnerContent(title);
  } }).on('meta[property="og:title"]', set(title)).on('meta[property="og:description"]', set(desc)).on('meta[property="og:image"]', set(img)).on('meta[property="og:url"]', set(url.href)).transform(res);
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
var routes = [
  {
    routePath: "/api/preview",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/visits",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/visits",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = /* @__PURE__ */ __name(class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
}, "__Facade_ScheduledController__");
__name2(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../.npm/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../.npm/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-Q4JTKX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../.npm/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-Q4JTKX/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__2, "__Facade_ScheduledController__");
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.7669548011665601.js.map
