(() => {
  const { $, $$, icon, esc, download, today } = M.util;

  const render = (root, query) => {
    const st = M.store.state;
    const s = st.settings;
    const hasKey = M.ai.hasKey();
    const masked = hasKey ? `${s.apiKey.slice(0, 10)}…${s.apiKey.slice(-4)}` : "";

    root.innerHTML = `
      <header class="page-head rise">
        <div><p class="eyebrow">${esc(M.t("settings.eyebrow"))}</p><h1>${esc(M.t("nav.settings"))}</h1></div>
      </header>
      <div class="settings">
        <section class="card rise" style="--i:1" id="ai">
          <div class="card-head"><h3>${icon("sparkle", 17)} ${esc(M.t("settings.ai"))}</h3><span class="badge ${hasKey ? "good" : ""}" data-aistatus>${esc(hasKey ? M.t("settings.aiOn") : M.t("settings.aiOff"))}</span></div>
          <p class="muted">${esc(M.t("settings.aiText"))}</p>
          <div class="form">
            <label class="field"><span>${esc(M.t("settings.key"))}</span>
              <div class="key-row">
                <input class="input mono" id="api-key" type="password" autocomplete="off" spellcheck="false" placeholder="${esc(hasKey ? masked : "sk-ant-...")}" aria-describedby="key-help">
                <button class="icon-btn" data-peek title="${esc(M.t("settings.show"))}" aria-label="${esc(M.t("settings.show"))}">${icon("eye", 17)}</button>
                <button class="btn primary" data-savekey>${icon("check", 16)}<span>${esc(M.t("common.save"))}</span></button>
              </div>
            </label>
            <p class="muted small" id="key-help">${M.t("settings.keyHelp")}</p>
            <div class="row-gap">
              <button class="btn soft sm" data-test ${hasKey ? "" : "disabled"}>${icon("bolt", 15)}<span>${esc(M.t("settings.test"))}</span></button>
              ${hasKey ? `<button class="btn ghost sm" data-removekey>${icon("trash", 15)}<span>${esc(M.t("settings.removeKey"))}</span></button>` : ""}
              <span class="small" data-testres></span>
            </div>
            <div class="field"><span>${esc(M.t("settings.model"))}</span>
              <div class="model-pick">
                ${M.ai.MODELS.map((m) => `<label class="model${M.ai.model() === m.id ? " on" : ""}"><input type="radio" name="model" value="${m.id}" ${M.ai.model() === m.id ? "checked" : ""}><b>${esc(m.name)}</b><small>${esc(M.t(`settings.model.${m.tier}`))}</small></label>`).join("")}
              </div>
            </div>
          </div>
        </section>

        <section class="card rise" style="--i:2">
          <div class="card-head"><h3>${icon("globe", 17)} ${esc(M.t("settings.general"))}</h3></div>
          <div class="form">
            <label class="field"><span>${esc(M.t("onboard.name"))}</span><input class="input" data-name maxlength="40" value="${esc(s.name)}" placeholder="${esc(M.t("onboard.namePh"))}"></label>
            <div class="field"><span>${esc(M.t("settings.language"))}</span><div class="seg" role="group">
              <button data-setlang="en" class="${s.lang === "en" ? "on" : ""}">English</button>
              <button data-setlang="mk" class="${s.lang === "mk" ? "on" : ""}">Македонски</button>
            </div></div>
            <div class="field"><span>${esc(M.t("settings.theme"))}</span><div class="seg" role="group">
              ${["system", "light", "dark"].map((th) => `<button data-settheme="${th}" class="${s.theme === th ? "on" : ""}">${icon(th === "system" ? "monitor" : th === "light" ? "sun" : "moon", 15)}<span>${esc(M.t(`theme.${th}.short`))}</span></button>`).join("")}
            </div></div>
            <label class="toggle"><input type="checkbox" data-sounds ${s.sounds !== false ? "checked" : ""}><span class="tg"></span><span>${esc(M.t("settings.sounds"))}</span></label>
          </div>
        </section>

        <section class="card rise" style="--i:3">
          <div class="card-head"><h3>${icon("timer", 17)} ${esc(M.t("settings.study"))}</h3></div>
          <div class="field-row">
            <label class="field"><span>${esc(M.t("settings.focusLen"))}</span><input class="input" type="number" min="1" max="180" data-num="focusMinutes" value="${s.focusMinutes}"></label>
            <label class="field"><span>${esc(M.t("settings.breakLen"))}</span><input class="input" type="number" min="1" max="60" data-num="breakMinutes" value="${s.breakMinutes}"></label>
            <label class="field"><span>${esc(M.t("settings.goal"))}</span><input class="input" type="number" min="5" max="600" step="5" data-num="dailyGoal" value="${s.dailyGoal}"></label>
          </div>
        </section>

        <section class="card rise" style="--i:4">
          <div class="card-head"><h3>${icon("book", 17)} ${esc(M.t("settings.subjects"))}</h3></div>
          <ul class="subject-list">
            ${st.subjects
              .map((sub) => `<li>
                <button class="swatch" data-color="${sub.id}" style="--c:${esc(sub.color)}" title="${esc(M.t("settings.color"))}" aria-label="${esc(M.t("settings.color"))}"></button>
                <input class="input sm" data-sname="${sub.id}" value="${esc(sub.name)}" maxlength="40" aria-label="${esc(M.t("settings.subjectName"))}">
                <span class="muted small">${esc(M.t("settings.subjectCount", { c: M.store.cardsOf(sub.id).length, n: st.notes.filter((n) => n.subjectId === sub.id).length }))}</span>
                <button class="icon-btn sm" data-sdel="${sub.id}" title="${esc(M.t("common.delete"))}" aria-label="${esc(M.t("common.delete"))}">${icon("trash", 15)}</button>
              </li>`)
              .join("")}
          </ul>
          <div class="add-row">
            <input class="input" data-newsub maxlength="40" placeholder="${esc(M.t("settings.newSubject"))}">
            <button class="btn soft" data-addsub>${icon("plus", 16)}<span>${esc(M.t("common.add"))}</span></button>
          </div>
        </section>

        <section class="card rise" style="--i:5">
          <div class="card-head"><h3>${icon("download", 17)} ${esc(M.t("settings.data"))}</h3></div>
          <p class="muted small">${esc(M.t("settings.dataText"))}</p>
          <div class="row-gap">
            <button class="btn soft" data-export>${icon("download", 16)}<span>${esc(M.t("settings.export"))}</span></button>
            <label class="btn soft file-btn">${icon("upload", 16)}<span>${esc(M.t("settings.import"))}</span><input type="file" accept="application/json,.json" data-import hidden></label>
            <button class="btn ghost" data-sample>${icon("wand", 16)}<span>${esc(M.t("settings.sample"))}</span></button>
            <button class="btn danger-ghost" data-reset>${icon("trash", 16)}<span>${esc(M.t("settings.reset"))}</span></button>
          </div>
        </section>

        <p class="about muted small rise" style="--i:6">${M.app.LOGO.replace('width="34" height="34"', 'width="20" height="20"')} <span>Mentora 1.0 · ${esc(M.t("settings.about"))}</span></p>
      </div>`;

    const keyEl = $("#api-key", root);
    if (query.focus === "key") setTimeout(() => keyEl.focus(), 60);
    $("[data-peek]", root).addEventListener("click", () => {
      keyEl.type = keyEl.type === "password" ? "text" : "password";
    });
    const saveKey = () => {
      const v = keyEl.value.trim();
      if (!v) return M.ui.toast(M.t("settings.keyEmpty"), "bad");
      if (!/^sk-ant-/.test(v)) M.ui.toast(M.t("settings.keyOdd"), "info", 5000);
      s.apiKey = v;
      M.store.saveNow();
      M.ui.toast(M.t("settings.keySaved"), "good");
      M.app.rerender();
    };
    $("[data-savekey]", root).addEventListener("click", saveKey);
    keyEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveKey();
    });
    const rm = $("[data-removekey]", root);
    if (rm)
      rm.addEventListener("click", async () => {
        if (!(await M.ui.confirm(M.t("settings.removeConfirm"), { danger: true, ok: M.t("settings.removeKey") }))) return;
        s.apiKey = "";
        M.store.saveNow();
        M.app.rerender();
      });
    $("[data-test]", root).addEventListener("click", async (e) => {
      const b = e.currentTarget;
      const out = $("[data-testres]", root);
      b.disabled = true;
      b.classList.add("loading");
      out.className = "small muted";
      out.textContent = M.t("settings.testing");
      try {
        const r = await M.ai.ping();
        out.className = "small good-text";
        out.textContent = M.t("settings.testOk", { model: r.model });
      } catch (err) {
        out.className = "small bad-text";
        out.textContent = M.ai.errorText(err);
      } finally {
        b.disabled = false;
        b.classList.remove("loading");
      }
    });
    $$('input[name="model"]', root).forEach((r) =>
      r.addEventListener("change", () => {
        s.model = r.value;
        M.store.save();
        $$(".model", root).forEach((l) => l.classList.toggle("on", l.contains(r)));
      })
    );
    $("[data-name]", root).addEventListener("change", (e) => {
      s.name = e.target.value.trim();
      M.store.save();
      M.ui.toast(M.t("common.saved"), "good");
    });
    $$("[data-setlang]", root).forEach((b) => b.addEventListener("click", () => M.app.setLang(b.dataset.setlang)));
    $("[data-sounds]", root).addEventListener("change", (e) => {
      s.sounds = e.target.checked;
      M.store.save();
      if (s.sounds) M.fx.sound("correct");
    });
    $$("[data-settheme]", root).forEach((b) =>
      b.addEventListener("click", () => {
        s.theme = b.dataset.settheme;
        M.store.save();
        M.app.applyTheme();
        M.app.renderShell();
        M.app.rerender();
      })
    );
    $$("[data-num]", root).forEach((inp) =>
      inp.addEventListener("change", () => {
        const min = Number(inp.min), max = Number(inp.max);
        const v = M.util.clamp(Math.round(Number(inp.value) || min), min, max);
        inp.value = v;
        s[inp.dataset.num] = v;
        M.store.save();
        if (M.focus && !M.focus.running && M.focus.remaining === M.focus.total) M.focus.setMode(M.focus.mode, true);
        M.ui.toast(M.t("common.saved"), "good");
      })
    );
    $$("[data-sname]", root).forEach((inp) =>
      inp.addEventListener("change", () => {
        const sub = M.store.subject(inp.dataset.sname);
        if (!sub) return;
        const v = inp.value.trim();
        if (!v) {
          inp.value = sub.name;
          return;
        }
        sub.name = v;
        M.store.save();
        M.ui.toast(M.t("common.saved"), "good");
      })
    );
    $$("[data-color]", root).forEach((b) =>
      b.addEventListener("click", () => {
        const sub = M.store.subject(b.dataset.color);
        const C = M.store.COLORS;
        sub.color = C[(C.indexOf(sub.color) + 1) % C.length];
        b.style.setProperty("--c", sub.color);
        M.store.save();
      })
    );
    $$("[data-sdel]", root).forEach((b) =>
      b.addEventListener("click", async () => {
        const sub = M.store.subject(b.dataset.sdel);
        if (!sub) return;
        if (!(await M.ui.confirm(M.t("settings.subjectDelete", { name: sub.name }), { danger: true, ok: M.t("common.delete") }))) return;
        for (const k of ["notes", "cards", "plan", "sessions", "quizzes", "chats"]) {
          st[k].forEach((x) => {
            if (x.subjectId === sub.id) x.subjectId = "";
          });
        }
        st.subjects = st.subjects.filter((x) => x.id !== sub.id);
        M.store.save();
        M.app.rerender();
      })
    );
    const addSub = () => {
      const inp = $("[data-newsub]", root);
      const v = inp.value.trim();
      if (!v) return inp.focus();
      if (st.subjects.some((x) => x.name.toLowerCase() === v.toLowerCase())) return M.ui.toast(M.t("settings.subjectExists"), "bad");
      M.store.addSubject(v);
      M.app.rerender();
      setTimeout(() => $("[data-newsub]") && $("[data-newsub]").focus(), 30);
    };
    $("[data-addsub]", root).addEventListener("click", addSub);
    $("[data-newsub]", root).addEventListener("keydown", (e) => {
      if (e.key === "Enter") addSub();
    });
    $("[data-export]", root).addEventListener("click", () => {
      download(`mentora-backup-${today()}.json`, M.store.exportData());
      M.ui.toast(M.t("settings.exported"), "good");
    });
    $("[data-import]", root).addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (!(await M.ui.confirm(M.t("settings.importConfirm"), { danger: true, ok: M.t("settings.import") }))) return;
        M.store.importData(text);
        M.app.applyTheme();
        M.app.applyLang();
        M.app.renderShell();
        M.app.rerender();
        M.ui.toast(M.t("settings.imported"), "good");
      } catch {
        M.ui.toast(M.t("settings.importBad"), "bad", 5000);
      } finally {
        e.target.value = "";
      }
    });
    $("[data-sample]", root).addEventListener("click", async () => {
      if (!(await M.ui.confirm(M.t("settings.sampleConfirm"), { ok: M.t("settings.sample") }))) return;
      M.store.loadSample(s.lang);
      M.ui.toast(M.t("settings.sampleDone"), "good");
      M.app.rerender();
    });
    $("[data-reset]", root).addEventListener("click", async () => {
      if (!(await M.ui.confirm(M.t("settings.resetConfirm"), { danger: true, ok: M.t("settings.reset") }))) return;
      M.store.reset();
      try {
        sessionStorage.removeItem("mentora.focus");
      } catch {}
      location.hash = "#/home";
      location.reload();
    });
  };

  M.views.settings = { render };
})();
