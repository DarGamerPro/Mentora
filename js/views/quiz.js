(() => {
  const { $, $$, icon, esc, uid, today, relDay, fmtDate } = M.util;
  const LETTERS = ["A", "B", "C", "D"];
  let setup = { source: "cards", subject: "", topic: "", noteId: "", count: 10, level: "medium" };
  let session = null;

  const render = (root, query) => {
    if (query.subject !== undefined) {
      setup.subject = query.subject;
      setup.source = "cards";
      session = null;
    }
    if (query.note) {
      const note = M.store.state.notes.find((n) => n.id === query.note);
      if (note) {
        setup.source = "note";
        setup.noteId = note.id;
        setup.subject = note.subjectId || "";
        session = null;
        history.replaceState(null, "", "#/quiz");
        if (M.ai.hasKey()) {
          renderSetup(root);
          return start(root);
        }
        setup.source = "cards";
        M.ui.toast(M.t("quiz.noteOffline"), "info", 5000);
      }
    }
    if (session && !session.done) return renderPlay(root);
    if (session && session.done) return renderResults(root);
    renderSetup(root);
  };

  const sourceHelp = () => M.t(`quiz.src.${setup.source}.help`);

  const renderSetup = (root) => {
    const st = M.store.state;
    const history = st.quizzes.slice(-8).reverse();
    const aiSource = setup.source !== "cards";
    root.innerHTML = `
      <header class="page-head rise">
        <div><p class="eyebrow">${esc(M.t("quiz.eyebrow"))}</p><h1>${esc(M.t("nav.quiz"))}</h1></div>
      </header>
      <div class="quiz-setup">
        <section class="card setup-card rise" style="--i:1">
          <h3>${esc(M.t("quiz.source"))}</h3>
          <div class="source-pick">
            ${[["cards", "cards"], ["topic", "sparkle"], ["note", "notes"]]
              .map(([id, ic]) => `<button class="source${setup.source === id ? " on" : ""}" data-src="${id}">${icon(ic, 20)}<b>${esc(M.t(`quiz.src.${id}`))}</b><small>${esc(id === "cards" ? M.t("quiz.offlineOk") : M.t("quiz.needsAi"))}</small></button>`)
              .join("")}
          </div>
          <p class="muted small">${esc(sourceHelp())}</p>
          <div class="form">
            ${setup.source === "topic" ? `<label class="field"><span>${esc(M.t("quiz.topic"))}</span><input class="input" data-topic maxlength="200" placeholder="${esc(M.t("quiz.topicPh"))}" value="${esc(setup.topic)}"></label>` : ""}
            ${setup.source === "note" ? `<label class="field"><span>${esc(M.t("quiz.note"))}</span><select class="input" data-note>${st.notes.length ? st.notes.map((n) => `<option value="${n.id}" ${setup.noteId === n.id ? "selected" : ""}>${esc(n.title || M.t("notes.untitled"))}</option>`).join("") : `<option value="">${esc(M.t("notes.none"))}</option>`}</select></label>` : ""}
            ${setup.source !== "note" ? `<label class="field"><span>${esc(M.t("common.subject"))}</span><select class="input" data-subject><option value="">${esc(setup.source === "cards" ? M.t("cards.all") : M.t("tutor.anySubject"))}</option>${st.subjects.map((s) => `<option value="${s.id}" ${setup.subject === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>` : ""}
            <div class="field"><span>${esc(M.t("quiz.count"))}</span><div class="seg" role="group">${[5, 10, 15].map((n) => `<button data-count="${n}" class="${setup.count === n ? "on" : ""}">${n}</button>`).join("")}</div></div>
            ${aiSource ? `<div class="field"><span>${esc(M.t("quiz.level"))}</span><div class="seg" role="group">${["easy", "medium", "hard"].map((l) => `<button data-level="${l}" class="${setup.level === l ? "on" : ""}">${esc(M.t(`quiz.level.${l}`))}</button>`).join("")}</div></div>` : ""}
          </div>
          <button class="btn primary big block" data-start>${icon("play", 17)}<span>${esc(M.t("quiz.start"))}</span></button>
        </section>
        <section class="card rise" style="--i:2">
          <div class="card-head"><h3>${esc(M.t("quiz.history"))}</h3></div>
          ${history.length ? `<ul class="history">${history
            .map((q) => {
              const pct = Math.round((q.correct / Math.max(1, q.total)) * 100);
              return `<li><span class="h-score ${pct >= 80 ? "good" : pct >= 50 ? "warn" : "bad"}">${pct}%</span><span class="h-main"><b>${esc(q.title || M.store.subjectName(q.subjectId))}</b><small class="muted">${q.correct}/${q.total} · ${esc(M.t(`quiz.src.${q.source || "cards"}`))} · ${esc(relDay(q.date))}</small></span></li>`;
            })
            .join("")}</ul>` : `<p class="muted">${esc(M.t("quiz.noHistory"))}</p>`}
        </section>
      </div>`;

    $$("[data-src]", root).forEach((b) =>
      b.addEventListener("click", () => {
        setup.source = b.dataset.src;
        if (setup.source === "note" && !setup.noteId && st.notes[0]) setup.noteId = st.notes[0].id;
        renderSetup(root);
      })
    );
    $$("[data-count]", root).forEach((b) =>
      b.addEventListener("click", () => {
        setup.count = Number(b.dataset.count);
        $$("[data-count]", root).forEach((x) => x.classList.toggle("on", x === b));
      })
    );
    $$("[data-level]", root).forEach((b) =>
      b.addEventListener("click", () => {
        setup.level = b.dataset.level;
        $$("[data-level]", root).forEach((x) => x.classList.toggle("on", x === b));
      })
    );
    const topic = $("[data-topic]", root);
    if (topic) {
      topic.addEventListener("input", () => (setup.topic = topic.value));
      topic.addEventListener("keydown", (e) => {
        if (e.key === "Enter") start(root);
      });
    }
    const note = $("[data-note]", root);
    if (note) {
      if (!setup.noteId && note.value) setup.noteId = note.value;
      note.addEventListener("change", () => (setup.noteId = note.value));
    }
    const subj = $("[data-subject]", root);
    if (subj) subj.addEventListener("change", () => (setup.subject = subj.value));
    $("[data-start]", root).addEventListener("click", () => start(root));
  };

  const start = async (root) => {
    const st = M.store.state;
    let questions = null;
    let title = "";
    let subjectId = setup.subject || "";
    if (setup.source === "cards") {
      questions = M.brain.quizFromCards(subjectId || null, setup.count);
      if (!questions) return M.ui.toast(M.t("quiz.needCards"), "bad", 4500);
      title = subjectId ? M.store.subjectName(subjectId) : M.t("quiz.mixed");
    } else {
      if (!M.ai.hasKey()) return M.app.needKey();
      let material = "";
      let topic = "";
      if (setup.source === "topic") {
        topic = (setup.topic || "").trim();
        if (topic.length < 2) {
          M.ui.toast(M.t("quiz.topicMissing"), "bad");
          const el = $("[data-topic]", root);
          if (el) el.focus();
          return;
        }
        title = topic;
      } else {
        const note = st.notes.find((n) => n.id === setup.noteId);
        if (!note || note.body.trim().length < 20) return M.ui.toast(M.t("notes.tooShort"), "bad");
        material = `${note.title}\n\n${note.body}`;
        title = note.title || M.t("notes.untitled");
        subjectId = note.subjectId || "";
      }
      const btn = $("[data-start]", root);
      if (btn) {
        btn.disabled = true;
        btn.classList.add("loading");
        btn.querySelector("span").textContent = M.t("quiz.generating");
      }
      try {
        questions = await M.ai.makeQuiz({ topic, material, count: setup.count, level: setup.level });
      } catch (err) {
        M.ui.toast(M.ai.errorText(err), "bad", 5000);
        if (btn && document.body.contains(btn)) {
          btn.disabled = false;
          btn.classList.remove("loading");
          btn.querySelector("span").textContent = M.t("quiz.start");
        }
        return;
      }
    }
    session = { id: uid(), title, subjectId, source: setup.source, questions, index: 0, answers: [], done: false, started: Date.now() };
    if (location.hash.startsWith("#/quiz")) renderPlay($("#view"));
  };

  const renderPlay = (root) => {
    const s = session;
    const q = s.questions[s.index];
    const answered = s.answers[s.index];
    const score = s.answers.filter((a) => a && a.correct).length;
    const streak = combo(s);
    root.innerHTML = `
      <div class="quiz-play rise">
        <div class="review-top">
          <button class="btn ghost sm" data-quit>${icon("x", 15)}<span>${esc(M.t("quiz.quit"))}</span></button>
          <span class="review-count">${esc(M.t("quiz.qOf", { i: s.index + 1, n: s.questions.length }))}</span>
          <span class="quiz-badges">${streak >= 2 ? `<span class="combo" title="${esc(M.t("xp.combo"))}">${icon("flame", 14)} ${streak}×</span>` : ""}<span class="score-pill">${icon("check", 14)} ${score}</span></span>
        </div>
        <div class="progress"><span style="width:${(s.index / s.questions.length) * 100}%"></span></div>
        <article class="card q-card">
          <p class="eyebrow">${esc(s.title)}</p>
          <h2 class="q-text">${esc(q.question)}</h2>
          <div class="options">
            ${q.options
              .map((o, i) => {
                let cls = "";
                if (answered) cls = i === q.answer ? " right" : i === answered.choice ? " wrong" : " dim";
                return `<button class="option${cls}" data-opt="${i}" ${answered ? "disabled" : ""}><kbd>${LETTERS[i]}</kbd><span>${esc(o)}</span>${answered && i === q.answer ? icon("check", 18) : answered && i === answered.choice ? icon("x", 18) : ""}</button>`;
              })
              .join("")}
          </div>
          ${answered ? `<div class="feedback ${answered.correct ? "good" : "bad"}">
              <b>${esc(answered.correct ? M.t("quiz.right") : M.t("quiz.wrong"))}</b>
              ${q.explanation ? `<p>${esc(q.explanation)}</p>` : !answered.correct ? `<p>${esc(M.t("quiz.correctWas", { a: q.options[q.answer] }))}</p>` : ""}
            </div>
            <button class="btn primary big" data-next>${esc(s.index + 1 < s.questions.length ? M.t("quiz.next") : M.t("quiz.finish"))} ${icon("arrow", 17)}</button>` : `<p class="muted small">${esc(M.t("quiz.keysHint"))}</p>`}
        </article>
      </div>`;

    $$("[data-opt]", root).forEach((b) => b.addEventListener("click", () => answer(root, Number(b.dataset.opt))));
    const next = $("[data-next]", root);
    if (next) {
      next.addEventListener("click", () => advance(root));
      next.focus({ preventScroll: true });
    }
    $("[data-quit]", root).addEventListener("click", async () => {
      if (s.answers.filter(Boolean).length && !(await M.ui.confirm(M.t("quiz.quitConfirm"), { ok: M.t("quiz.quit"), danger: true }))) return;
      session = null;
      M.app.rerender();
    });
  };

  const answer = (root, choice) => {
    const s = session;
    if (!s || s.answers[s.index]) return;
    const q = s.questions[s.index];
    if (choice < 0 || choice >= q.options.length) return;
    const correct = choice === q.answer;
    s.answers[s.index] = { choice, correct };
    if (q.cardId) {
      const card = M.store.state.cards.find((c) => c.id === q.cardId);
      if (card) card.quizMiss = Math.max(0, (card.quizMiss || 0) + (correct ? -1 : 1));
    }
    M.store.log("quiz", 1);
    renderPlay(root);
    if (correct) {
      const el = $(".option.right", root);
      if (el) el.classList.add("fresh");
      const streak = combo(s);
      M.fx.sound("correct");
      if (streak >= 3) M.fx.burstAt(el, 28);
      M.xp.award(streak >= 3 ? 15 : 10, el, streak >= 3 ? { label: `${streak}×` } : {});
    } else {
      M.fx.sound("wrong");
      M.xp.award(2, $(".option.wrong", root));
    }
  };

  const combo = (s) => {
    let n = 0;
    for (let i = s.answers.length - 1; i >= 0; i--) {
      if (s.answers[i] && s.answers[i].correct) n++;
      else break;
    }
    return n;
  };

  const advance = (root) => {
    const s = session;
    if (!s || !s.answers[s.index]) return;
    if (s.index + 1 < s.questions.length) {
      s.index++;
      renderPlay(root);
    } else {
      s.done = true;
      const correct = s.answers.filter((a) => a && a.correct).length;
      M.store.state.quizzes.push({ id: s.id, subjectId: s.subjectId, date: today(), total: s.questions.length, correct, source: s.source, title: s.title });
      M.store.save();
      renderResults(root);
    }
  };

  const renderResults = (root) => {
    const s = session;
    const total = s.questions.length;
    const correct = s.answers.filter((a) => a && a.correct).length;
    const pct = Math.round((correct / total) * 100);
    const missed = s.questions.map((q, i) => ({ q, a: s.answers[i] })).filter((x) => !x.a || !x.a.correct);
    const msg = pct === 100 ? "perfect" : pct >= 80 ? "great" : pct >= 50 ? "ok" : "low";
    const R = 52, C = 2 * Math.PI * R;
    root.innerHTML = `
      <div class="quiz-result rise">
        <article class="card result-card">
          <svg class="ring" viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
            <circle cx="60" cy="60" r="${R}" class="ring-bg"/>
            <circle cx="60" cy="60" r="${R}" class="ring-fg ${pct >= 80 ? "good" : pct >= 50 ? "warn" : "bad"}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 60 60)"/>
            <text x="60" y="58" text-anchor="middle" class="ring-num">${pct}%</text>
            <text x="60" y="78" text-anchor="middle" class="ring-sub">${correct}/${total}</text>
          </svg>
          <h1>${esc(M.t(`quiz.msg.${msg}`))}</h1>
          <p class="muted">${esc(s.title)}</p>
          <div class="row-gap center">
            ${missed.length ? `<button class="btn soft" data-retry>${icon("reset", 16)}<span>${esc(M.t("quiz.retryMissed", { n: missed.length }))}</span></button>` : ""}
            ${missed.length && s.source !== "cards" ? `<button class="btn soft" data-save>${icon("cards", 16)}<span>${esc(M.t("quiz.saveMissed"))}</span></button>` : ""}
            <button class="btn primary" data-new>${icon("plus", 16)}<span>${esc(M.t("quiz.newQuiz"))}</span></button>
          </div>
        </article>
        ${missed.length ? `<article class="card">
          <div class="card-head"><h3>${esc(M.t("quiz.review"))}</h3></div>
          <ul class="missed">${missed
            .map(({ q, a }) => `<li><b>${esc(q.question)}</b><span class="good-text">${icon("check", 14)} ${esc(q.options[q.answer])}</span>${a ? `<span class="bad-text">${icon("x", 14)} ${esc(q.options[a.choice])}</span>` : ""}${q.explanation ? `<small class="muted">${esc(q.explanation)}</small>` : ""}</li>`)
            .join("")}</ul>
        </article>` : ""}
      </div>`;
    $("[data-new]", root).addEventListener("click", () => {
      session = null;
      M.app.rerender();
    });
    if (!s.rewarded) {
      s.rewarded = true;
      if (pct >= 80) M.fx.celebrate({ count: pct === 100 ? 190 : 110 });
      setTimeout(() => M.xp.award(pct === 100 ? 35 : 10, $(".ring", root), { label: M.t(pct === 100 ? "xp.perfect" : "xp.quizDone") }), 400);
    }
    const retry = $("[data-retry]", root);
    if (retry)
      retry.addEventListener("click", () => {
        const qs = missed.map(({ q }) => {
          const opts = M.util.shuffle(q.options);
          return { ...q, options: opts, answer: opts.indexOf(q.options[q.answer]) };
        });
        session = { ...s, id: uid(), questions: qs, index: 0, answers: [], done: false, rewarded: false, title: `${s.title} · ${M.t("quiz.retryTag")}` };
        renderPlay(root);
      });
    const save = $("[data-save]", root);
    if (save)
      save.addEventListener("click", () => {
        M.views.cards.preview(
          missed.map(({ q }) => ({ front: q.question, back: q.options[q.answer] })),
          s.subjectId
        );
      });
  };

  const onKey = (e) => {
    if (!session || session.done || !location.hash.startsWith("#/quiz")) return;
    if (e.target.closest("input, textarea, select") || document.querySelector(".modal-back")) return;
    const root = $("#view");
    const k = e.key.toUpperCase();
    const idx = /^[1-4]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
    if (idx >= 0 && !session.answers[session.index]) {
      e.preventDefault();
      answer(root, idx);
    } else if (e.key === "Enter" && session.answers[session.index] && !e.target.closest("button")) {
      e.preventDefault();
      advance(root);
    }
  };
  document.addEventListener("keydown", onKey);

  M.views.quiz = { render };
})();
