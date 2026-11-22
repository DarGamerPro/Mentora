(() => {
  const { $, $$, icon, esc } = M.util;
  const S = () => M.store.state.settings;

  const NAV = [
    ["home", "home"],
    ["tutor", "tutor"],
    ["notes", "notes"],
    ["cards", "cards"],
    ["quiz", "quiz"],
    ["planner", "calendar"],
    ["focus", "timer"],
    ["settings", "settings"],
  ];
  const ALIAS = { review: "cards" };

  const LOGO = `<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--ink)"/><path d="M9.5 22.5V11l6.5 6.5 6.5-6.5v11.5" fill="none" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="7" r="4" fill="var(--hl)" stroke="var(--bg)" stroke-width="1.5"/></svg>`;

  M.views = M.views || {};
  let cleanup = null;

  const parseHash = () => {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const name = path || "home";
    const query = Object.fromEntries(new URLSearchParams(qs || ""));
    return { name, query };
  };

  const applyTheme = () => {
    const th = S().theme;
    if (th === "light" || th === "dark") document.documentElement.dataset.theme = th;
    else delete document.documentElement.dataset.theme;
  };
  const applyLang = () => {
    document.documentElement.lang = S().lang === "mk" ? "mk" : "en";
  };

  const themeIcon = () => (S().theme === "light" ? "sun" : S().theme === "dark" ? "moon" : "monitor");

  const renderShell = () => {
    const app = $("#app");
    app.innerHTML = `<div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/home" aria-label="Mentora">${LOGO}<span class="brand-text"><b>Mentora</b><small>${esc(M.t("app.tagline"))}</small></span></a>
        <nav class="nav" aria-label="${esc(M.t("app.nav"))}">
          ${NAV.map(([id, ic]) => `<a href="#/${id}" data-nav="${id}">${icon(ic, 19)}<span>${esc(M.t(`nav.${id}`))}</span><em class="nav-badge" data-badge="${id}"></em></a>`).join("")}
        </nav>
        <div class="side-foot">
          <a class="focus-mini" href="#/focus" hidden>${icon("timer", 16)}<span></span></a>
          <div class="side-row">
            <div class="seg seg-sm" role="group" aria-label="${esc(M.t("settings.language"))}">
              <button data-lang="en" class="${S().lang === "en" ? "on" : ""}">EN</button>
              <button data-lang="mk" class="${S().lang === "mk" ? "on" : ""}">MK</button>
            </div>
            <button class="icon-btn theme-btn" title="${esc(M.t("settings.theme"))}" aria-label="${esc(M.t("settings.theme"))}">${icon(themeIcon(), 18)}</button>
          </div>
        </div>
      </aside>
      <main class="main" id="view" tabindex="-1"></main>
    </div>`;
    $$("[data-lang]", app).forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
    $(".theme-btn", app).addEventListener("click", () => {
      const order = ["system", "light", "dark"];
      S().theme = order[(order.indexOf(S().theme) + 1) % order.length];
      M.store.save();
      applyTheme();
      $(".theme-btn", app).innerHTML = icon(themeIcon(), 18);
      M.ui.toast(M.t(`theme.${S().theme}`));
    });
    updateBadges();
    if (M.focus) M.focus.paintMini();
  };

  const updateBadges = () => {
    const due = M.store.dueCards().length;
    const el = $('[data-badge="cards"]');
    if (el) {
      el.textContent = due > 99 ? "99+" : due || "";
      el.hidden = !due;
    }
  };

  const setLang = (lang) => {
    S().lang = lang === "mk" ? "mk" : "en";
    M.store.save();
    applyLang();
    renderShell();
    route();
  };

  const route = () => {
    if (cleanup) {
      try {
        cleanup();
      } catch {}
      cleanup = null;
    }
    const { name, query } = parseHash();
    const view = M.views[name] ? name : "home";
    const navId = ALIAS[view] || view;
    $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === navId));
    const root = $("#view");
    if (!root) return;
    root.className = `main view-${view}`;
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    try {
      const res = M.views[view].render(root, query);
      if (typeof res === "function") cleanup = res;
    } catch (err) {
      console.error(err);
      root.innerHTML = `<div class="empty card"><h2>${esc(M.t("app.oops"))}</h2><p class="muted">${esc(err && err.message)}</p><a class="btn primary" href="#/home">${esc(M.t("nav.home"))}</a></div>`;
    }
    updateBadges();
    document.title = M.focus && M.focus.running ? M.focus.titleText() : `${M.t(`nav.${navId}`)} · Mentora`;
  };

  const rerender = () => route();

  const onboarding = () => {
    const lang = S().lang;
    const { close } = M.ui.modal({
      dismissable: false,
      body: `<div class="onboard">
        <div class="onboard-logo">${LOGO}</div>
        <h1>${M.t("onboard.title")}</h1>
        <p class="muted">${esc(M.t("onboard.text"))}</p>
        <div class="seg onboard-lang" role="group">
          <button type="button" data-ol="en" class="${lang === "en" ? "on" : ""}">${icon("globe", 15)} English</button>
          <button type="button" data-ol="mk" class="${lang === "mk" ? "on" : ""}">${icon("globe", 15)} Македонски</button>
        </div>
        <label class="field"><span>${esc(M.t("onboard.name"))}</span><input id="ob-name" maxlength="40" autocomplete="given-name" placeholder="${esc(M.t("onboard.namePh"))}" value="${esc(S().name)}"></label>
        <label class="check"><input type="checkbox" id="ob-sample" checked><span>${esc(M.t("onboard.sample"))}</span></label>
        <button class="btn primary big block" id="ob-go">${esc(M.t("onboard.go"))} ${icon("arrow", 18)}</button>
      </div>`,
      onOpen: (el) => {
        $$("[data-ol]", el).forEach((b) =>
          b.addEventListener("click", () => {
            S().name = $("#ob-name", el).value;
            S().lang = b.dataset.ol;
            applyLang();
            close();
            renderShell();
            route();
            onboarding();
          })
        );
        const go = () => {
          S().name = $("#ob-name", el).value.trim();
          S().onboarded = true;
          if ($("#ob-sample", el).checked && !M.store.state.subjects.length) M.store.loadSample(S().lang);
          M.store.saveNow();
          close();
          location.hash = "#/home";
          renderShell();
          route();
          M.ui.toast(M.t("onboard.done"), "good");
        };
        $("#ob-go", el).addEventListener("click", go);
        $("#ob-name", el).addEventListener("keydown", (e) => {
          if (e.key === "Enter") go();
        });
      },
    });
  };

  const needKey = () => {
    M.ui.modal({
      title: M.t("ai.needKey.title"),
      body: `<p>${esc(M.t("ai.needKey.text"))}</p><ol class="steps"><li>${M.t("ai.needKey.s1")}</li><li>${esc(M.t("ai.needKey.s2"))}</li><li>${esc(M.t("ai.needKey.s3"))}</li></ol>`,
      actions: [
        { label: M.t("common.close"), kind: "ghost" },
        { label: M.t("ai.needKey.open"), kind: "primary", icon: "key", onClick: () => { location.hash = "#/settings?focus=key"; } },
      ],
    });
  };

  const init = () => {
    M.store.load();
    applyTheme();
    applyLang();
    if (M.focus) M.focus.restore();
    renderShell();
    window.addEventListener("hashchange", route);
    window.addEventListener("beforeunload", () => M.store.saveNow());
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme());
    window.addEventListener("storage", (e) => {
      if (e.key === "mentora.v1" && !M.busy) {
        M.store.load();
        renderShell();
        route();
      }
    });
    route();
    if (!S().onboarded) onboarding();
  };

  M.app = { route, rerender, renderShell, updateBadges, needKey, applyTheme, applyLang, setLang, LOGO };
  document.addEventListener("DOMContentLoaded", init);
})();
