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
  // Кука _ga — лише для сайту гри (/Game-CubePix/…), не для всього roshevasternin.github.io (там і сайт студії)
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

  var state = load(), loaded = false, sent = 0, played = false, queue = [];
  // /play/: питаємо не з порога, а коли гравець уже побачив гру (Ходент: доречний момент) — після першої розкритої картини чи
  // туторіалу, або через ASK_PLAY мс від першого старту картини. Не грав — не питаємо
  var ASK_END = 1200, ASK_PLAY = 45000, askTimer = 0, asked = false;
  function ask(ms) {
    if (state !== null || open || asked) return;
    clearTimeout(askTimer);
    askTimer = setTimeout(function () { if (state === null && !open) { asked = true; show(false); } }, ms);
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
    if (force) { var b = box.querySelector('[data-cpc="' + (state || "granted") + '"]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* */ } }
  }
  function hide() { open = false; box.hidden = true; root.classList.remove("cpc-open"); }
  function choose(v) {
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
      if (name === "level_start" || name === "tutorial_begin") { if (!played) { played = true; ask(ASK_PLAY); } }
      if ((name === "level_end" && p.success === "true") || name === "tutorial_complete") ask(ASK_END);
      if (state === "granted" && loaded) send(ev[0], ev[1]);
      else if (state === null && queue.length < 40) queue.push(ev);
    };
    // Налаштування гри → «Налаштування приватності»: той самий банер; done — «✓ збережено» на рядку гри
    window.__cubepixPrivacy = function (done) { show(true, done); };
  }

  if (state === "granted") start();
  else if (state === null && MODE !== "play") show(false);      // /play/ — після першої картини чи туторіалу (ask)
})();
