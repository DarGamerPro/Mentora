(() => {
  const { uid, today, addDays, daysBetween, shuffle, esc } = M.util;

  const STOP = new Set(
    (
      "the and for are but not you your with this that from have has had was were what when where which who whom why how can could would should will " +
      "into about than then them they their there these those its it's our out over under also just only very more most some any all each every does did " +
      "doing been being a an of to in on at by or as is be it if so do i me my we us he she him her his hers explain tell give show please describe mean means " +
      "кој која кое кои што како каде кога зошто дали има нема или и а но на во со за од до по при низ преку ги го ја ме те се си е сум си беше биле бил била " +
      "тоа тој таа тие ова овој оваа овие оној онаа оние мене тебе нас вас нив мој моја мое мои твој твоја наш наша ваш ваша еден една едно објасни кажи покажи"
    ).split(/\s+/)
  );

  const tokenize = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s+#]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w));

  const stem = (w) => (w.length > 5 ? w.slice(0, w.length - 2) : w);

  const extractCards = (text) => {
    const out = [];
    const seen = new Set();
    const push = (front, back) => {
      const f = front.trim().replace(/[*_`]/g, "");
      const b = back.trim().replace(/[*_`]/g, "");
      if (f.length < 1 || b.length < 2 || f.length > 120 || b.length > 300) return;
      const key = f.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ front: f, back: b });
    };
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || /^#/.test(line) || /^```/.test(line)) continue;
      const body = line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
      let m = body.match(/^(.{1,80}?)\s+[-–—]\s+(.+)$/);
      if (!m) m = body.match(/^([^:]{1,60}):\s+(.+)$/);
      if (m && m[1].split(/\s+/).length <= 8) {
        push(m[1], m[2]);
        continue;
      }
      const def = body.match(/^((?:\S+\s+){0,3}\S+)\s+(is|are|means|е|се|значи)\s+(.{8,240}?)[.!]?$/i);
      if (def && !/^(this|it|that|there|тоа|ова|тој|таа)$/i.test(def[1])) push(def[1], `${def[2]} ${def[3]}`);
    }
    return out;
  };

  const sentencesOf = (text) =>
    String(text || "")
      .replace(/\r\n?/g, "\n")
      .split(/\n+|(?<=[.!?])\s+/)
      .map((s) => s.replace(/^[-*•#\s]+/, "").trim())
      .filter((s) => s.length > 3);

  const search = (question, subjectId) => {
    const terms = [...new Set(tokenize(question).map(stem))];
    if (!terms.length) return { terms, hits: [], cards: [] };
    const score = (text) => {
      const words = tokenize(text);
      let s = 0;
      for (const t of terms) if (words.some((w) => w.startsWith(t) || t.startsWith(stem(w)))) s += 1;
      return s;
    };
    const notes = M.store.state.notes.filter((n) => !subjectId || n.subjectId === subjectId);
    const hits = [];
    for (const n of notes) {
      for (const sentence of sentencesOf(`${n.title}.\n${n.body}`)) {
        const s = score(sentence);
        if (s > 0) hits.push({ text: sentence, note: n, score: s + (score(n.title) > 0 ? 0.5 : 0) });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    const cards = M.store
      .cardsOf(subjectId)
      .map((c) => ({ c, s: score(`${c.front} ${c.back}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.c);
    return { terms, hits: hits.slice(0, 4), cards };
  };

  const offlineAnswer = (question, subjectId) => {
    const { hits, cards } = search(question, subjectId);
    if (!hits.length && !cards.length) return M.t("brain.nothing");
    let out = M.t("brain.intro") + "\n\n";
    const byNote = new Map();
    for (const h of hits) {
      if (!byNote.has(h.note.id)) byNote.set(h.note.id, { note: h.note, lines: [] });
      byNote.get(h.note.id).lines.push(h.text);
    }
    for (const { note, lines } of byNote.values()) {
      out += `**${note.title}**\n`;
      for (const l of lines) out += `> ${l}\n`;
      out += "\n";
    }
    if (cards.length) {
      out += `${M.t("brain.cards")}\n`;
      for (const c of cards) out += `- **${c.front}**: ${c.back}\n`;
      out += "\n";
    }
    return out + M.t("brain.outro");
  };

  const weightOf = (c) => 1 + (c.lapses || 0) * 2 + (c.quizMiss || 0) * 2 + ((c.ease || 2.5) < 2.3 ? 1 : 0) + (M.srs.status(c) === "new" ? 0.5 : 0);

  const pickWeighted = (items, count) => {
    const pool = items.map((c) => ({ c, w: weightOf(c) }));
    const out = [];
    while (out.length < count && pool.length) {
      const total = pool.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length - 1; idx++) {
        r -= pool[idx].w;
        if (r <= 0) break;
      }
      out.push(pool.splice(idx, 1)[0].c);
    }
    return out;
  };

  const quizFromCards = (subjectId, count) => {
    const all = M.store.state.cards.filter((c) => c.front && c.back);
    const pool = subjectId ? all.filter((c) => c.subjectId === subjectId) : all;
    if (pool.length < 2 || all.length < 4) return null;
    const chosen = pickWeighted(pool, Math.min(count, pool.length));
    return chosen.map((card) => {
      const correct = card.back.trim();
      const sameSubject = all.filter((c) => c.id !== card.id && c.subjectId === card.subjectId);
      const others = all.filter((c) => c.id !== card.id && c.subjectId !== card.subjectId);
      const candidates = [];
      const seen = new Set([correct.toLowerCase()]);
      for (const group of [sameSubject, others]) {
        const sorted = shuffle(group).sort((a, b) => Math.abs(a.back.length - correct.length) - Math.abs(b.back.length - correct.length));
        for (const c of sorted) {
          const v = c.back.trim();
          if (seen.has(v.toLowerCase())) continue;
          seen.add(v.toLowerCase());
          candidates.push(v);
          if (candidates.length >= 3) break;
        }
        if (candidates.length >= 3) break;
      }
      const options = shuffle([correct, ...candidates.slice(0, 3)]);
      return { question: card.front, options, answer: options.indexOf(correct), explanation: "", cardId: card.id };
    });
  };

  const AUTO_OFFSETS = [1, 2, 4, 7, 11, 16];
  const autoPlan = (exam) => {
    const t = today();
    const st = M.store.state;
    st.plan = st.plan.filter((p) => !(p.auto && p.examId === exam.id && !p.done));
    const subject = M.store.subjectName(exam.subjectId);
    let added = 0;
    for (const off of AUTO_OFFSETS) {
      const date = addDays(exam.date, -off);
      if (date < t) continue;
      const title = off === 1 ? M.t("plan.autoFinal", { exam: exam.title }) : M.t("plan.autoReview", { subject });
      st.plan.push({ id: uid(), type: "task", subjectId: exam.subjectId, title, date, done: false, minutes: off === 1 ? 30 : 25, examId: exam.id, auto: true });
      added++;
    }
    M.store.save();
    return added;
  };

  const recommend = () => {
    const st = M.store.state;
    const t = today();
    const recs = [];
    for (const exam of M.store.upcomingExams()) {
      const d = daysBetween(t, exam.date);
      const m = M.store.mastery(exam.subjectId);
      const subject = M.store.subjectName(exam.subjectId);
      if (d <= 3) {
        recs.push({ score: 100 - d, icon: "target", title: M.t("rec.examSoon.title", { exam: exam.title, n: d }), body: M.t("rec.examSoon.body", { subject }), href: `#/quiz?subject=${exam.subjectId}`, cta: M.t("rec.quizCta") });
      } else if (d <= 7 && (m === null || m < 0.7)) {
        recs.push({ score: 75 - d, icon: "target", title: M.t("rec.examWeek.title", { exam: exam.title, n: d }), body: M.t("rec.examWeek.body", { subject, pct: m === null ? "0" : Math.round(m * 100) }), href: `#/quiz?subject=${exam.subjectId}`, cta: M.t("rec.quizCta") });
      }
    }
    const due = M.store.dueCards().length;
    if (due > 0) recs.push({ score: 60 + Math.min(due, 20), icon: "cards", title: M.t("rec.due.title", { n: due }), body: M.t("rec.due.body"), href: "#/review", cta: M.t("rec.dueCta") });
    const lonely = st.notes.find((n) => n.body && n.body.length > 40 && !st.cards.some((c) => c.subjectId === n.subjectId));
    if (lonely) recs.push({ score: 45, icon: "wand", title: M.t("rec.notes.title", { title: lonely.title }), body: M.t("rec.notes.body"), href: `#/notes?id=${lonely.id}`, cta: M.t("rec.notesCta") });
    const todayAct = st.activity[t] || {};
    if (!todayAct.minutes) recs.push({ score: 30, icon: "timer", title: M.t("rec.focus.title"), body: M.t("rec.focus.body", { n: st.settings.focusMinutes }), href: "#/focus", cta: M.t("rec.focusCta") });
    const recentQuiz = st.quizzes.some((q) => daysBetween(q.date, t) <= 2);
    if (!recentQuiz && st.cards.length >= 4) recs.push({ score: 25, icon: "quiz", title: M.t("rec.quiz.title"), body: M.t("rec.quiz.body"), href: "#/quiz", cta: M.t("rec.quizCta") });
    recs.push({ score: 10, icon: "tutor", title: M.t("rec.tutor.title"), body: M.t("rec.tutor.body"), href: "#/tutor", cta: M.t("rec.tutorCta") });
    return recs.sort((a, b) => b.score - a.score);
  };

  M.brain = { tokenize, extractCards, search, offlineAnswer, quizFromCards, autoPlan, recommend, esc };
})();
