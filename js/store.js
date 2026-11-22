(() => {
  const { uid, today, addDays, daysBetween } = M.util;
  const KEY = "mentora.v1";
  const COLORS = ["#2b4fd8", "#2e8b57", "#d1432f", "#c7801a", "#8a3fc7", "#0e8a8a", "#c23d7a", "#6b7a2a"];

  const defaults = () => ({
    version: 1,
    settings: {
      lang: "en",
      theme: "system",
      apiKey: "",
      model: "claude-opus-5-5",
      name: "",
      focusMinutes: 25,
      breakMinutes: 5,
      dailyGoal: 45,
      onboarded: false,
    },
    subjects: [],
    notes: [],
    cards: [],
    quizzes: [],
    plan: [],
    sessions: [],
    activity: {},
    chats: [],
  });

  const merge = (base, raw) => {
    const out = defaults();
    if (!raw || typeof raw !== "object") return out;
    out.settings = { ...base.settings, ...(raw.settings && typeof raw.settings === "object" ? raw.settings : {}) };
    for (const k of ["subjects", "notes", "cards", "quizzes", "plan", "sessions", "chats"]) {
      if (Array.isArray(raw[k])) out[k] = raw[k].filter((x) => x && typeof x === "object");
    }
    if (raw.activity && typeof raw.activity === "object" && !Array.isArray(raw.activity)) out.activity = raw.activity;
    return out;
  };

  let storageOk = true;
  const store = {
    state: defaults(),
    COLORS,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.state = merge(defaults(), raw ? JSON.parse(raw) : null);
      } catch {
        storageOk = false;
        this.state = defaults();
      }
      return this.state;
    },
    saveNow() {
      if (!storageOk) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch {
        M.ui.toast(M.t("toast.storageFull"), "bad", 5000);
      }
    },
    save() {
      clearTimeout(this._t);
      this._t = setTimeout(() => this.saveNow(), 120);
    },
    get settings() {
      return this.state.settings;
    },
    subject(id) {
      return this.state.subjects.find((s) => s.id === id) || null;
    },
    subjectName(id) {
      const s = this.subject(id);
      return s ? s.name : M.t("common.general");
    },
    subjectColor(id) {
      const s = this.subject(id);
      return s ? s.color : "var(--muted)";
    },
    addSubject(name, color) {
      const s = { id: uid(), name: name.trim(), color: color || COLORS[this.state.subjects.length % COLORS.length] };
      this.state.subjects.push(s);
      this.save();
      return s;
    },
    log(kind, amount = 1, day = today()) {
      const a = (this.state.activity[day] = this.state.activity[day] || {});
      a[kind] = (a[kind] || 0) + amount;
      this.save();
    },
    activeOn(day) {
      const a = this.state.activity[day];
      return !!a && Object.values(a).some((v) => v > 0);
    },
    streak() {
      let d = today();
      if (!this.activeOn(d)) d = addDays(d, -1);
      let n = 0;
      while (this.activeOn(d) && n < 3650) {
        n++;
        d = addDays(d, -1);
      }
      return n;
    },
    lastDays(count = 7) {
      const out = [];
      for (let i = count - 1; i >= 0; i--) {
        const day = addDays(today(), -i);
        const a = this.state.activity[day] || {};
        out.push({ day, minutes: a.minutes || 0, cards: a.cards || 0, quiz: a.quiz || 0, chats: a.chats || 0 });
      }
      return out;
    },
    cardsOf(subjectId) {
      return subjectId ? this.state.cards.filter((c) => c.subjectId === subjectId) : this.state.cards;
    },
    dueCards(subjectId) {
      const t = today();
      return this.cardsOf(subjectId).filter((c) => !c.due || c.due <= t);
    },
    mastery(subjectId) {
      const cards = this.cardsOf(subjectId);
      const quizzes = this.state.quizzes.filter((q) => q.subjectId === subjectId && q.total > 0).slice(-5);
      const cardScore = cards.length ? cards.reduce((s, c) => s + Math.min(1, (c.reps ? c.interval || 0 : 0) / 21), 0) / cards.length : null;
      const quizScore = quizzes.length ? quizzes.reduce((s, q) => s + q.correct / q.total, 0) / quizzes.length : null;
      if (cardScore === null && quizScore === null) return null;
      if (cardScore === null) return quizScore;
      if (quizScore === null) return cardScore;
      return cardScore * 0.7 + quizScore * 0.3;
    },
    upcomingExams() {
      const t = today();
      return this.state.plan.filter((p) => p.type === "exam" && p.date >= t).sort((a, b) => a.date.localeCompare(b.date));
    },
    reset() {
      const keep = { lang: this.state.settings.lang, theme: this.state.settings.theme };
      this.state = defaults();
      Object.assign(this.state.settings, keep);
      this.saveNow();
    },
    exportData() {
      const copy = JSON.parse(JSON.stringify(this.state));
      copy.settings.apiKey = "";
      copy.exportedAt = new Date().toISOString();
      return JSON.stringify(copy, null, 2);
    },
    importData(text) {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== "object" || !raw.settings || !Array.isArray(raw.cards)) throw new Error("format");
      const key = this.state.settings.apiKey;
      this.state = merge(defaults(), raw);
      if (!this.state.settings.apiKey) this.state.settings.apiKey = key;
      this.state.settings.onboarded = true;
      this.saveNow();
    },
    loadSample(lang) {
      const data = M.sample(lang);
      const t = today();
      const subj = {};
      for (const s of data.subjects) {
        const created = { id: uid(), name: s.name, color: s.color };
        subj[s.key] = created.id;
        this.state.subjects.push(created);
      }
      for (const n of data.notes) {
        this.state.notes.push({ id: uid(), subjectId: subj[n.s], title: n.title, body: n.body, created: Date.now(), updated: Date.now() - 3600e3 });
      }
      for (const c of data.cards) {
        const [reps, interval, ease, offset] = c.srs;
        const due = addDays(t, offset);
        this.state.cards.push({
          id: uid(),
          subjectId: subj[c.s],
          front: c.f,
          back: c.b,
          reps,
          interval,
          ease,
          lapses: 0,
          due,
          lastReviewed: reps ? addDays(due, -interval) : null,
          created: Date.now(),
        });
      }
      for (const p of data.plan) {
        this.state.plan.push({ id: uid(), type: p.type, subjectId: subj[p.s], title: p.title, date: addDays(t, p.offset), done: !!p.done, minutes: p.minutes || 0 });
      }
      for (const [offset, minutes, cards, quiz, s] of data.activity) {
        const day = addDays(t, offset);
        this.state.activity[day] = { minutes, cards, quiz };
        if (minutes) this.state.sessions.push({ id: uid(), date: day, minutes, subjectId: subj[s] });
      }
      for (const q of data.quizzes) {
        this.state.quizzes.push({ id: uid(), subjectId: subj[q.s], date: addDays(t, q.offset), total: q.total, correct: q.correct, source: "cards" });
      }
      for (const exam of this.upcomingExams()) M.brain.autoPlan(exam);
      this.saveNow();
    },
    daysUntil(day) {
      return daysBetween(today(), day);
    },
  };

  M.store = store;
})();
