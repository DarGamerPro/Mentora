(() => {
  const { $, $$, icon, esc, uid, today, fmtMinutes } = M.util;
  const KEY = "mentora.focus";

  const F = {
    mode: "focus",
    running: false,
    endAt: 0,
    remaining: 0,
    total: 0,
    subjectId: "",
    timer: null,
    listeners: new Set(),

    minutesFor(mode) {
      const s = M.store.state.settings;
      return mode === "focus" ? M.util.clamp(Number(s.focusMinutes) || 25, 1, 180) : M.util.clamp(Number(s.breakMinutes) || 5, 1, 60);
    },
    left() {
      return this.running ? Math.max(0, this.endAt - Date.now()) : this.remaining;
    },
    persist() {
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ mode: this.mode, running: this.running, endAt: this.endAt, remaining: this.remaining, total: this.total, subjectId: this.subjectId }));
      } catch {}
    },
    restore() {
      try {
        const raw = JSON.parse(sessionStorage.getItem(KEY) || "null");
        if (raw && raw.total) Object.assign(this, raw);
      } catch {}
      if (!this.total) this.setMode("focus", true);
      if (this.running) {
        if (Date.now() >= this.endAt) {
          this.running = false;
          this.remaining = 0;
          this.complete();
        } else this.loop();
      }
    },
    setMode(mode, silent) {
      this.mode = mode;
      this.running = false;
      this.total = this.minutesFor(mode) * 60000;
      this.remaining = this.total;
      clearInterval(this.timer);
      this.persist();
      if (!silent) this.emit();
    },
    start() {
      if (this.running) return;
      if (this.remaining <= 0) this.setMode(this.mode, true);
      this.running = true;
      this.endAt = Date.now() + this.remaining;
      this.unlockAudio();
      this.loop();
      this.persist();
      this.emit();
    },
    pause() {
      if (!this.running) return;
      this.remaining = Math.max(0, this.endAt - Date.now());
      this.running = false;
      clearInterval(this.timer);
      this.persist();
      this.emit();
    },
    reset() {
      this.setMode(this.mode);
    },
    loop() {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (this.left() <= 0) {
          clearInterval(this.timer);
          this.running = false;
          this.remaining = 0;
          this.complete();
        }
        this.emit();
      }, 250);
    },
    logFocus(minutes) {
      if (minutes < 1) return;
      const st = M.store.state;
      st.sessions.push({ id: uid(), date: today(), minutes, subjectId: this.subjectId || "" });
      M.store.log("minutes", minutes);
    },
    finishEarly() {
      if (this.mode !== "focus") return this.setMode("focus");
      const spent = Math.floor((this.total - this.left()) / 60000);
      this.logFocus(spent);
      if (spent >= 1) M.ui.toast(M.t("focus.logged", { n: spent }), "good");
      this.setMode("break");
    },
    complete() {
      if (this.mode === "focus") {
        const minutes = Math.round(this.total / 60000);
        this.logFocus(minutes);
        this.chime();
        M.ui.toast(M.t("focus.doneFocus", { n: minutes }), "good", 6000);
        this.setMode("break");
      } else {
        this.chime();
        M.ui.toast(M.t("focus.doneBreak"), "info", 6000);
        this.setMode("focus");
      }
      this.persist();
    },
    fmt(ms) {
      const s = Math.ceil(ms / 1000);
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    },
    titleText() {
      return `${this.fmt(this.left())} \u00b7 ${M.t(this.mode === "focus" ? "focus.focus" : "focus.break")} \u00b7 Mentora`;
    },
    emit() {
      this.paintMini();
      if (this.running) document.title = this.titleText();
      else if (/\d\d:\d\d/.test(document.title)) document.title = "Mentora";
      this.listeners.forEach((fn) => fn());
    },
    paintMini() {
      const mini = $(".focus-mini");
      if (!mini) return;
      const show = this.running || (this.remaining > 0 && this.remaining < this.total);
      mini.hidden = !show;
      if (show) {
        mini.classList.toggle("paused", !this.running);
        mini.classList.toggle("is-break", this.mode === "break");
        $("span", mini).textContent = `${this.fmt(this.left())}`;
      }
    },
    audio: null,
    unlockAudio() {
      try {
        if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audio.state === "suspended") this.audio.resume();
      } catch {}
    },
    chime() {
      try {
        this.unlockAudio();
        const ctx = this.audio;
        if (!ctx) return;
        [0, 0.18, 0.36].forEach((t, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = [660, 880, 990][i];
          g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.5);
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + t);
          o.stop(ctx.currentTime + t + 0.55);
        });
      } catch {}
    },
  };

  const R = 118;
  const C = 2 * Math.PI * R;

  const render = (root) => {
    const st = M.store.state;
    if (!F.running && F.remaining === F.total) F.setMode(F.mode, true);
    const todaySessions = st.sessions.filter((s) => s.date === today());
    const todayMin = todaySessions.reduce((a, s) => a + s.minutes, 0);
    const goal = st.settings.dailyGoal || 45;

    root.innerHTML = `
      <header class="page-head rise">
        <div><p class="eyebrow">${esc(M.t("focus.eyebrow"))}</p><h1>${esc(M.t("nav.focus"))}</h1></div>
      </header>
      <div class="focus-layout">
        <section class="card focus-card rise" style="--i:1">
          <div class="seg" role="group">
            <button data-fmode="focus">${icon("target", 15)}<span>${esc(M.t("focus.focus"))} · ${F.minutesFor("focus")}</span></button>
            <button data-fmode="break">${icon("sun", 15)}<span>${esc(M.t("focus.break"))} · ${F.minutesFor("break")}</span></button>
          </div>
          <div class="dial">
            <svg viewBox="0 0 280 280" aria-hidden="true">
              <circle cx="140" cy="140" r="${R}" class="dial-bg"/>
              <g class="ticks">${Array.from({ length: 60 }, (_, i) => {
                const a = (i / 60) * Math.PI * 2;
                const r1 = i % 5 ? 131 : 128;
                return `<line x1="${140 + Math.sin(a) * r1}" y1="${140 - Math.cos(a) * r1}" x2="${140 + Math.sin(a) * 135}" y2="${140 - Math.cos(a) * 135}"/>`;
              }).join("")}</g>
              <circle cx="140" cy="140" r="${R}" class="dial-fg" stroke-dasharray="${C}" transform="rotate(-90 140 140)"/>
            </svg>
            <div class="dial-center">
              <span class="dial-mode" data-dmode></span>
              <span class="dial-time" data-time role="timer" aria-live="off"></span>
              <span class="dial-sub muted small" data-dsub></span>
            </div>
          </div>
          <div class="focus-controls">
            <button class="icon-btn lg" data-reset title="${esc(M.t("focus.reset"))}" aria-label="${esc(M.t("focus.reset"))}">${icon("reset", 20)}</button>
            <button class="btn primary big play" data-toggle></button>
            <button class="icon-btn lg" data-skip title="${esc(M.t("focus.finish"))}" aria-label="${esc(M.t("focus.finish"))}">${icon("skip", 20)}</button>
          </div>
          <label class="field inline center"><span>${esc(M.t("focus.on"))}</span>
            <select class="input sm" data-fsubj><option value="">${esc(M.t("common.general"))}</option>${st.subjects.map((s) => `<option value="${s.id}" ${F.subjectId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
          </label>
        </section>
        <aside class="focus-side">
          <section class="card rise" style="--i:2">
            <div class="card-head"><h3>${esc(M.t("focus.today"))}</h3><span class="muted small">${esc(fmtMinutes(todayMin))} / ${esc(fmtMinutes(goal))}</span></div>
            <div class="meter big"><span style="width:${Math.min(100, Math.round((todayMin / goal) * 100))}%"></span></div>
            ${todaySessions.length ? `<ul class="session-list">${todaySessions
              .slice()
              .reverse()
              .map((s) => `<li><span class="dot" style="--c:${esc(M.store.subjectColor(s.subjectId))}"></span><span>${esc(M.store.subjectName(s.subjectId))}</span><b>${s.minutes} ${esc(M.t("unit.min"))}</b></li>`)
              .join("")}</ul>` : `<p class="muted small">${esc(M.t("focus.none"))}</p>`}
          </section>
          <section class="card tip-card rise" style="--i:3">
            <h3>${icon("sparkle", 16)} ${esc(M.t("focus.tipTitle"))}</h3>
            <p class="muted">${esc(M.t("focus.tip"))}</p>
            <a class="small link" href="#/settings">${esc(M.t("focus.change"))}</a>
          </section>
        </aside>
      </div>`;

    const fg = $(".dial-fg", root);
    const paint = () => {
      const left = F.left();
      $("[data-time]", root).textContent = F.fmt(left);
      $("[data-dmode]", root).textContent = M.t(F.mode === "focus" ? "focus.focus" : "focus.break");
      $("[data-dsub]", root).textContent = F.running ? M.t("focus.running") : left < F.total ? M.t("focus.paused") : M.t("focus.ready");
      fg.style.strokeDashoffset = String(C * (1 - left / F.total));
      root.querySelector(".focus-card").classList.toggle("is-break", F.mode === "break");
      root.querySelector(".focus-card").classList.toggle("is-running", F.running);
      const toggle = $("[data-toggle]", root);
      toggle.innerHTML = F.running ? `${icon("pause", 20)}<span>${esc(M.t("focus.pause"))}</span>` : `${icon("play", 20)}<span>${esc(left < F.total ? M.t("focus.resume") : M.t("focus.start"))}</span>`;
      $$("[data-fmode]", root).forEach((b) => b.classList.toggle("on", b.dataset.fmode === F.mode));
    };
    let lastMode = F.mode;
    const onTick = () => {
      if (!document.body.contains(fg)) return;
      if (F.mode !== lastMode && !F.running) {
        lastMode = F.mode;
        M.app.rerender();
        return;
      }
      paint();
    };
    F.listeners.add(onTick);
    paint();

    $("[data-toggle]", root).addEventListener("click", () => (F.running ? F.pause() : F.start()));
    $("[data-reset]", root).addEventListener("click", () => F.reset());
    $("[data-skip]", root).addEventListener("click", async () => {
      if (F.mode === "focus" && F.left() < F.total) {
        const spent = Math.floor((F.total - F.left()) / 60000);
        if (!(await M.ui.confirm(M.t("focus.finishConfirm", { n: spent }), { ok: M.t("focus.finish") }))) return;
      }
      F.finishEarly();
      M.app.rerender();
    });
    $$("[data-fmode]", root).forEach((b) =>
      b.addEventListener("click", async () => {
        if (b.dataset.fmode === F.mode) return;
        if (F.running && !(await M.ui.confirm(M.t("focus.switchConfirm")))) return;
        F.setMode(b.dataset.fmode);
        lastMode = F.mode;
        paint();
      })
    );
    $("[data-fsubj]", root).addEventListener("change", (e) => {
      F.subjectId = e.target.value;
      F.persist();
    });
    const onKey = (e) => {
      if (e.key === " " && !e.target.closest("input, textarea, select, button") && !document.querySelector(".modal-back")) {
        e.preventDefault();
        F.running ? F.pause() : F.start();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      F.listeners.delete(onTick);
      document.removeEventListener("keydown", onKey);
    };
  };

  M.focus = F;
  M.views.focus = { render };
})();
