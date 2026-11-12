/* ─────────────────────────────────────────────────────────────────────────────
   CubePix — Google Analytics 4 лише за згодою (сайт гри: сторінка, /play/, політика). Власник 28.10.2026: «підключити і веб…
   я теж хочу бачити в Firebase» — вебпотік «CubePix Web» тієї ж властивості GA4, що й Android (cubepix-1). Як Orbit Dash
   (site/src/consent.js там): перевірений шлях, без власних винаходів.

   Правило сайту «жодних сторонніх запитів» тримається для кожного, хто не сказав «Allow»: до вибору й після «Decline» — ні
   gtag.js, ні жодного пінгу (і без «cookieless»-режиму Consent Mode — gtag просто не вантажиться). «Allow» — тоді й лише тоді
   вантажиться googletagmanager.com/gtag/js і йдуть події на google-analytics.com.

   Налаштування — window.__cubepixConsent (ставить scripts/build-site.mjs перед цим скриптом):
     id     — measurementId вебпотоку (G-…; site/site.json → ga4)
     mode   — "page" (сторінка сайту: page_view + store_click), "play" (/play/: ще події гри через window.__cubepixTrack),
              "privacy" (політика: лише показати й змінити вибір — gtag там не вантажиться ніколи)
     S, rtl — лише /play/: тексти банера всіма мовами й мови справа наліво; мову бере з <html lang>, який ставить гра
              (сторінка сайту перекладає банер своїм скриптом — data-t)

   Вибір — localStorage "lewydo:cubepix-analytics" = {"v":"granted"|"denied","t":мс}; через 395 днів (13 місяців) питаємо знову.
   Змінити — [data-cpc-open] (підвал сторінки, кнопка в політиці) і «Налаштування приватності» в Налаштуваннях гри
   (window.__cubepixPrivacy).
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";
  var C = window.__cubepixConsent || {};
  var ID = C.id, MODE = C.mode || "page";
  var KEY = "lewydo:cubepix-analytics", TTL = 395 * 864e5;
  var box = document.getElementById("cpc");
  if (!box || !/^G-[A-Z0-9]+$/.test(ID || "")) return;
  var root = document.documentElement;
  // Кука _ga — на шлях сайту гри: з 06.11.2026 у гри свій хост (cubepix.lewydo.com) — це «/»; на старій адресі github.io був
  // /Game-CubePix/ (там і сайт студії). Шлях береться від самого скрипта, тож працює на будь-якій адресі
  var BASE = (function () {
    try { return new URL("../", (document.currentScript || {}).src || location.href).pathname; } catch (e) { return "/"; }
  })();

  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "null");
      if (o && (o.v === "granted" || o.v === "denied") && Date.now() - (+o.t || 0) < TTL) return o.v;
    } catch (e) { /* приватне вікно, вимкнене сховище — питаємо щоразу */ }
    return null;
  }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify({ v: v, t: Date.now() })); } catch (e) { /* лише на цей захід */ } }

  var state = load(), loaded = false, sent = 0, queue = [];

  /* ── our anonymous visit counter (owner 12.11.2026; the same as on orbitdash.lewydo.com — its site/src/consent.js) ──────────
     The ONE exception to «nothing leaves before Allow»: one small message to our own counter at stats.lewydo.com (Cloudflare Worker
     lewydo-site-stats → Workers Analytics Engine) — for everyone, before a choice and after «Decline», because it keeps nothing personal:
     no cookies, no ids, no IP, no address or referrer — only these 5 fields (contract: Game-Orbit-Dash-PRIVATE/server/site-stats/README.md):
       s "cp"   p "home" | "play" | "privacy" | "other"   e "view" | "allow" | "decline"   c the choice BEFORE the event: granted | denied | none
       src a source label worked out here on the device: utm_source (lower case, not an id) → the kind of site in the referrer (its host only:
           self / studio / orbitdash / cubepix / google / … / other) → the TikTok / Instagram / Facebook in-app browser (the user agent itself is
           never sent) → "none".
     Only navigator.sendBeacon; nothing is written to storage — it only reads the Allow / Decline choice the banner already saved (load()). */
  var STATS = typeof C.stats === "string" ? C.stats : "https://stats.lewydo.com/h";
  var REF = [
    // youtube before google: com.google.android.youtube is the YouTube app, not the search
    ["youtube", /(^|\.)youtube\.com$|(^|\.)youtu\.be$|^com\.google\.android\.youtube$/],
    ["google", /(^|\.)google\.[a-z.]+$|^com\.google\.android\./],
    ["bing", /(^|\.)bing\.com$/],
    ["duckduckgo", /(^|\.)duckduckgo\.com$/],
    ["tiktok", /(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$|^com\.zhiliaoapp\.musically/],
    ["instagram", /(^|\.)instagram\.com$|^com\.instagram\./],
    ["facebook", /(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)messenger\.com$|^com\.facebook\./],
    ["x", /(^|\.)x\.com$|(^|\.)twitter\.com$|^t\.co$/],
    ["reddit", /(^|\.)reddit\.com$|(^|\.)redd\.it$/],
    ["discord", /(^|\.)discord\.com$|(^|\.)discord\.gg$|(^|\.)discordapp\.com$/],
    ["telegram", /^t\.me$|(^|\.)telegram\.org$|(^|\.)telegram\.me$|^org\.telegram\./],
  ];
  // the in-app browser (no referrer): the user agent is read ONLY here, to pick one of three labels — it goes nowhere
  var APP = [
    ["tiktok", /musical_ly|TikTok|Bytedance|trill_/i],
    ["instagram", /Instagram/],
    ["facebook", /FBAN|FBAV|FB_IAB|FBIOS/],
  ];
  function inApp() {
    var ua = String(navigator.userAgent || "");
    for (var i = 0; i < APP.length; i++) if (APP[i][1].test(ua)) return APP[i][0];
    return "none";
  }
  function refKind(h) {
    if (h === location.hostname) return "self";
    if (h === "lewydo.com" || h === "www.lewydo.com") return "studio";
    if (h === "orbitdash.lewydo.com") return "orbitdash";
    if (h === "cubepix.lewydo.com") return "cubepix";
    if (/(^|\.)lewydo\.com$/.test(h)) return "studio";
    for (var i = 0; i < REF.length; i++) if (REF[i][1].test(h)) return REF[i][0];
    return "other";
  }
  function source() {
    try {
      var u = (new URLSearchParams(location.search).get("utm_source") || "").toLowerCase();
      if (u && /^[a-z0-9_.-]{1,32}$/.test(u) && !/^[0-9a-f]{12,}$|\d{6,}/.test(u)) return u;
      if (document.referrer) {
        var h = new URL(document.referrer).hostname.toLowerCase();
        if (h) return refKind(h);
      }
      return inApp();
    } catch (e) { return "none"; }
  }
  function page() { return MODE === "play" ? "play" : MODE === "privacy" ? "privacy" : MODE === "page" ? "home" : "other"; }
  function hit(e, before) {
    try {
      if (!STATS || !navigator.sendBeacon) return;
      navigator.sendBeacon(STATS, JSON.stringify({ s: "cp", p: page(), e: e, c: before === "granted" || before === "denied" ? before : "none", src: source() }));
    } catch (err) { /* the counter never matters more than the page */ }
  }
  (function () {
    var sentView = false;
    function view() { if (!sentView) { sentView = true; hit("view", load()); } }
    try {
      if (document.prerendering) document.addEventListener("prerenderingchange", view, { once: true });
      else view();
    } catch (e) { /* */ }
  })();
  // Власник 29.10.2026 (як Orbit Dash того ж дня): «питай при вході, а якщо не надав — то ще й після забігу». Банер — одразу при вході
  // (і на сторінці, і в /play/); гравець нічого не обрав — після першої розкритої картини чи туторіалу банер раз за захід нагадує про
  // себе: на екрані — дві хвилі світла по обвідці (cpc-nudge; «Зменшити рух» — лише обвідка), схований — з'являється знову.
  // «Відхилити» — теж вибір: більше не питаємо (до кінця терміну згоди, TTL).
  var nudged = false;
  function nudge() {
    if (state !== null || nudged) return;
    nudged = true;
    if (!open) { show(false); return; }
    box.classList.remove("cpc-nudge"); void box.offsetWidth; box.classList.add("cpc-nudge");
    setTimeout(function () { box.classList.remove("cpc-nudge"); }, 1700);
  }

  /* ── Google Analytics ───────────────────────────────────────────────────── */
  function gtag() { window.dataLayer.push(arguments); }
  function start() {
    if (MODE === "privacy") return;
    window["ga-disable-" + ID] = false;
    if (loaded) { gtag("consent", "update", { analytics_storage: "granted" }); flush(); return; }
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    gtag("js", new Date());
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("config", ID, {
      cookie_path: BASE, cookie_expires: 34128000,            // 395 днів — як і сама згода
      // лише цей хост (cubepix.lewydo.com): типове 'auto' кладе _ga на .lewydo.com — і кука розліталась би на студію й Orbit Dash
      cookie_domain: location.hostname,
      allow_google_signals: false, allow_ad_personalization_signals: false,
    });
    if (MODE === "play") gtag("set", "user_properties", { game_lang: root.lang || "en", platform_kind: "web" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ID);
    document.head.appendChild(s);
    flush();
  }
  function stop() {
    window["ga-disable-" + ID] = true;
    if (loaded) gtag("consent", "update", { analytics_storage: "denied" });
    // відкликали — куки GA геть (на нашому шляху й, про всяк випадок, на корені)
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n !== "_ga" && n.indexOf("_ga_") !== 0) return;
      [BASE, "/"].forEach(function (p) { document.cookie = n + "=; Max-Age=0; path=" + p; document.cookie = n + "=; Max-Age=0; path=" + p + "; domain=" + location.hostname; });
    });
  }
  function send(name, params) {
    if (state !== "granted" || !loaded || sent >= 300) return;   // запобіжник: не більше 300 подій за захід
    sent++;
    gtag("event", name, params || {});
  }
  // Події гри до «Allow» не губимо, поки згода невідома: дозволили посеред гри — підуть одразу (не більше 40, лише цього заходу)
  function flush() { var q = queue; queue = []; q.forEach(function (e) { send(e[0], e[1]); }); }

  /* ── банер ───────────────────────────────────────────────────────────────── */
  var open = false, after = null;
  function show(force, done) {
    open = true; after = done || null;
    [].forEach.call(box.querySelectorAll("[data-cpc]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cpc") === state)); });
    box.hidden = false;
    root.classList.add("cpc-open");
    // смуга на всю ширину знизу (06.11.2026): сторінка сайту отримує знизу місце під неї — підвал не ховається; веб-гра розкладається сама
    if (MODE !== "play") document.body.style.paddingBottom = box.offsetHeight + "px";
    if (force) { var b = box.querySelector('[data-cpc="' + (state || "granted") + '"]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* */ } }
  }
  function hide() { open = false; box.hidden = true; root.classList.remove("cpc-open"); if (MODE !== "play") document.body.style.paddingBottom = ""; }
  function choose(v) {
    hit(v === "granted" ? "allow" : "decline", state);   // our counter: c is the choice BEFORE this tap
    state = v; save(v); hide();
    if (v === "granted") start(); else { queue = []; stop(); }
    var f = after; after = null;
    if (f) try { f(v); } catch (e) { /* */ }
  }
  [].forEach.call(box.querySelectorAll("[data-cpc]"), function (b) { b.addEventListener("click", function () { choose(b.getAttribute("data-cpc")); }); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-cpc-open]");
    if (!a) return;
    e.preventDefault();
    show(true);
  });

  /* /play/: тексти банера мовою гри (<html lang> ставить гра) */
  function translate() {
    var S = C.S || {}, L = root.lang || "en", P = S[L] || {}, E = S.en || {};
    [].forEach.call(box.querySelectorAll("[data-t]"), function (el) { var k = el.getAttribute("data-t"); var v = P[k] || E[k]; if (v) el.textContent = v; });
    var lab = P["consent.settings"] || E["consent.settings"];
    if (lab) box.setAttribute("aria-label", lab);
    box.dir = (C.rtl || []).indexOf(L) >= 0 ? "rtl" : "ltr";
    if (loaded && state === "granted") gtag("set", "user_properties", { game_lang: L });
  }
  if (MODE === "play" && C.S) {
    translate();
    try { new MutationObserver(translate).observe(root, { attributes: true, attributeFilter: ["lang"] }); } catch (e) { /* */ }
  }

  /* ── події ───────────────────────────────────────────────────────────────── */
  // Перехід у магазин — головна конверсія з вебу в застосунок: store_click { place, store }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.href || "", store = /play\.google\.com/.test(h) ? "google_play" : /apps\.apple\.com|itms-apps:/.test(h) ? "app_store" : null;
    if (!store) return;
    var place = a.getAttribute("data-place");
    if (!place) {
      var sec = a.closest("section[id]");
      place = MODE === "play" ? "game" : a.closest("footer") ? "footer" : a.closest("header") ? "header" : a.closest(".hero") ? "hero" : sec ? sec.id : "page";
    }
    send("store_click", { place: place, store: store });
  }, true);

  if (MODE === "play") {
    /* Гра кличе window.__cubepixTrack(назва, параметри) — події порту (AnalyticsSchema.kt: ті самі назви й параметри, що в
       Android), лише в публічній збірці (WEB у src/CubePix.jsx). Екран гри — page_view (вебпотік GA4 так рахує екрани);
       реклама й покупки тут — імітації, їхні події самі це кажуть (web_imitation). Без особистих даних. */
    var page = function (screen) {
      return { page_title: "CubePix · " + screen, page_location: location.origin + location.pathname + "#" + screen, screen_name: screen };
    };
    window.__cubepixTrack = function (name, p) {
      p = p || {};
      var ev = name === "screen_view" ? ["page_view", page(String(p.screen_name || ""))] : [name, p];
      if ((name === "level_end" && p.success === "true") || name === "tutorial_complete") setTimeout(nudge, 1200);
      if (state === "granted" && loaded) send(ev[0], ev[1]);
      else if (state === null && queue.length < 40) queue.push(ev);
    };
    // Налаштування гри → «Налаштування приватності»: той самий банер; done — «✓ збережено» на рядку гри
    window.__cubepixPrivacy = function (done) { show(true, done); };
  }

  if (state === "granted") start();
  else if (state === null) show(false);                         // при вході — на кожній сторінці, і в грі (власник 29.10)
})();
