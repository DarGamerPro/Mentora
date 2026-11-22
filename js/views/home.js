(() => {
  const { $, $$, icon, esc, today, daysBetween, fmtDate, fmtMinutes, relDay } = M.util;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 5 ? M.t("home.night") : h < 12 ? M.t("home.morning") : h < 18 ? M.t("home.afternoon") : M.t("home.evening");
  };

  const weekChart = (days, goal) => {
    const W = 420, H = 190, top = 26, bottom = 30, left = 6, right = 6;
    const max = Math.max(goal, ...days.map((d) => d.minutes), 10);
    const slot = (W - left - right) / days.length;
    const bw = Math.min(34, slot * 0.58);
    const y = (v) => top + (H - top - bottom) * (1 - v / max);
    const t = today();
    const goalY = y(goal);
    let bars = "";
    days.forEach((d, i) => {
      const x = left + slot * i + (slot - bw) / 2;
      const yy = y(d.minutes);
      const h = Math.max(d.minutes ? 3 : 0, H - bottom - yy);
      const isToday = d.day === t;
      const label = fmtDate(d.day, { weekday: "short" }).replace(".", "");
      bars += `<g class="bar${isToday ? " today" : ""}">
        <title>${esc(fmtDate(d.day, { weekday: "long", day: "numeric", month: "short" }))}: ${d.minutes} ${esc(M.t("unit.min"))}, ${d.cards} ${esc(M.t("home.cardsWord"))}</title>
        <rect class="track" x="${x}" y="${top}" width="${bw}" height="${H - top - bottom}" rx="${bw / 2.6}"/>
        ${d.minutes ? `<rect class="fill" x="${x}" y="${H - bottom - h}" width="${bw}" height="${h}" rx="${Math.min(bw / 2.6, h / 2)}" style="--d:${i * 60}ms"/>` : ""}
        ${d.minutes ? `<text class="val" x="${x + bw / 2}" y="${H - bottom - h - 7}" text-anchor="middle">${d.minutes}</text>` : ""}
        <text class="lbl" x="${x + bw / 2}" y="${H - 9}" text-anchor="middle">${esc(label)}</text>
        ${d.cards ? `<circle class="dot" cx="${x + bw / 2}" cy="${H - bottom + 1}" r="2.4"/>` : ""}
      </g>`;
    });
    return `<svg class="week-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(M.t("home.weekAria"))}">
      ${bars}
      <line class="goal" x1="${left}" x2="${W - right}" y1="${goalY}" y2="${goalY}"/>
      <text class="goal-lbl" x="${W - right}" y="${goalY - 6}" text-anchor="end">${esc(M.t("home.goal"))} ${goal}</text>
    </svg>`;
  };

  const render = (root) => {
    const st = M.store.state;
    const s = st.settings;
    const t = today();
    const recs = M.brain.recommend();
    const [rec, ...more] = recs;
    const streak = M.store.streak();
    const days = M.store.lastDays(7);
    const todayAct = st.activity[t] || {};
    const due = M.store.dueCards().length;
    const focusToday = todayAct.minutes || 0;
    const goal = s.dailyGoal || 45;
    const lastQuizzes = st.quizzes.filter((q) => q.total > 0).slice(-5);
    const accuracy = lastQuizzes.length ? Math.round((lastQuizzes.reduce((a, q) => a + q.correct / q.total, 0) / lastQuizzes.length) * 100) : null;
    const exams = M.store.upcomingExams().slice(0, 4);
    const tasks = st.plan
      .filter((p) => p.type === "task" && ((p.date === t) || (p.date < t && !p.done)))
      .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));
    const name = (s.name || "").trim();

    const streakDots = days
      .map((d) => `<span class="sdot${M.store.activeOn(d.day) ? " on" : ""}${d.day === t ? " now" : ""}" title="${esc(fmtDate(d.day, { weekday: "long" }))}"></span>`)
      .join("");

    root.innerHTML = `
      <header class="page-head rise">
        <div>
          <p class="eyebrow">${esc(fmtDate(t, { weekday: "long", day: "numeric", month: "long" }))}</p>
          <h1>${esc(greeting())}${name ? `, <span class="hl">${esc(name)}</span>` : ""}</h1>
        </div>
        <a class="btn ghost" href="#/tutor">${icon("tutor", 17)}<span>${esc(M.t("home.askTutor"))}</span></a>
      </header>

      <section class="grid home-grid">
        <article class="card rec-card span-8 rise" style="--i:1">
          <p class="eyebrow">${icon("sparkle", 14)} ${esc(M.t("home.next"))}</p>
          <div class="rec-main">
            <div class="rec-icon">${icon(rec.icon, 26)}</div>
            <div class="rec-text">
              <h2>${esc(rec.title)}</h2>
              <p>${esc(rec.body)}</p>
            </div>
          </div>
          <div class="rec-actions">
            <a class="btn primary" href="${rec.href}" data-rec>${esc(rec.cta)} ${icon("arrow", 17)}</a>
            ${more.slice(0, 2).map((r) => `<a class="chip-link" href="${r.href}">${icon(r.icon, 15)}<span>${esc(r.title)}</span></a>`).join("")}
          </div>
        </article>

        <article class="card streak-card span-4 rise" style="--i:2">
          <div class="streak-top">${icon("flame", 22)}<span>${esc(M.t("home.streak"))}</span></div>
          <div class="big-num">${streak}</div>
          <p class="streak-sub">${esc(M.t(streak === 1 ? "home.dayOne" : "home.days", { n: streak }))}${M.store.activeOn(t) ? "" : ` · ${esc(M.t("home.keepGoing"))}`}</p>
          <div class="streak-dots">${streakDots}</div>
        </article>

        <a class="card stat span-3 rise" style="--i:3" href="#/review">
          <span class="stat-label">${icon("cards", 16)} ${esc(M.t("home.due"))}</span>
          <span class="stat-num">${due}</span>
          <span class="stat-sub">${esc(due ? M.t("home.dueSub") : M.t("home.dueNone"))}</span>
        </a>
        <a class="card stat span-3 rise" style="--i:4" href="#/focus">
          <span class="stat-label">${icon("timer", 16)} ${esc(M.t("home.focusToday"))}</span>
          <span class="stat-num">${focusToday}<small>/${goal} ${esc(M.t("unit.min"))}</small></span>
          <span class="meter"><span style="width:${Math.min(100, Math.round((focusToday / goal) * 100))}%"></span></span>
        </a>
        <a class="card stat span-3 rise" style="--i:5" href="#/quiz">
          <span class="stat-label">${icon("quiz", 16)} ${esc(M.t("home.accuracy"))}</span>
          <span class="stat-num">${accuracy === null ? "–" : `${accuracy}<small>%</small>`}</span>
          <span class="stat-sub">${esc(lastQuizzes.length ? M.t("home.lastQuizzes", { n: lastQuizzes.length }) : M.t("home.noQuizzes"))}</span>
        </a>
        <a class="card stat span-3 rise" style="--i:6" href="#/notes">
          <span class="stat-label">${icon("book", 16)} ${esc(M.t("home.library"))}</span>
          <span class="stat-num">${st.cards.length}<small> ${esc(M.t("home.cardsWord"))}</small></span>
          <span class="stat-sub">${esc(M.t("home.notesCount", { n: st.notes.length }))}</span>
        </a>

        <article class="card span-7 rise" style="--i:7">
          <div class="card-head"><h3>${esc(M.t("home.week"))}</h3><span class="muted small">${esc(fmtMinutes(days.reduce((a, d) => a + d.minutes, 0)))}</span></div>
          ${weekChart(days, goal)}
        </article>

        <article class="card span-5 rise" style="--i:8">
          <div class="card-head"><h3>${esc(M.t("home.mastery"))}</h3><a class="small link" href="#/cards">${esc(M.t("home.allCards"))}</a></div>
          ${st.subjects.length ? `<ul class="mastery">${st.subjects
            .map((sub) => {
              const m = M.store.mastery(sub.id);
              const pct = m === null ? null : Math.round(m * 100);
              return `<li><span class="dot" style="--c:${esc(sub.color)}"></span><span class="m-name">${esc(sub.name)}</span><span class="m-bar"><span style="width:${pct || 0}%;--c:${esc(sub.color)}"></span></span><span class="m-pct">${pct === null ? "–" : pct + "%"}</span></li>`;
            })
            .join("")}</ul>` : `<p class="muted">${esc(M.t("home.noSubjects"))}</p>`}
        </article>

        <article class="card span-6 rise" style="--i:9">
          <div class="card-head"><h3>${esc(M.t("home.exams"))}</h3><a class="small link" href="#/planner">${esc(M.t("nav.planner"))}</a></div>
          ${exams.length ? `<ul class="exam-list">${exams
            .map((e) => {
              const d = daysBetween(t, e.date);
              return `<li><span class="date-chip"><b>${esc(fmtDate(e.date, { day: "numeric" }))}</b><small>${esc(fmtDate(e.date, { month: "short" }).replace(".", ""))}</small></span><span class="exam-main"><span class="exam-title">${esc(e.title)}</span><span class="muted small"><span class="dot" style="--c:${esc(M.store.subjectColor(e.subjectId))}"></span>${esc(M.store.subjectName(e.subjectId))}</span></span><span class="badge ${d <= 3 ? "bad" : d <= 7 ? "warn" : ""}">${esc(d === 0 ? M.t("day.today") : M.t("home.inDays", { n: d }))}</span></li>`;
            })
            .join("")}</ul>` : `<p class="muted">${esc(M.t("home.noExams"))}</p>`}
        </article>

        <article class="card span-6 rise" style="--i:10">
          <div class="card-head"><h3>${esc(M.t("home.todayPlan"))}</h3><span class="muted small">${tasks.filter((x) => x.done).length}/${tasks.length}</span></div>
          ${tasks.length ? `<ul class="task-list">${tasks
            .map((p) => `<li class="${p.done ? "done" : ""}"><label class="check"><input type="checkbox" data-task="${p.id}" ${p.done ? "checked" : ""}><span>${esc(p.title)}</span></label><span class="muted small">${p.date < t ? `<span class="badge bad">${esc(relDay(p.date))}</span>` : p.minutes ? esc(`${p.minutes} ${M.t("unit.min")}`) : ""}</span></li>`)
            .join("")}</ul>` : `<p class="muted">${esc(M.t("home.noTasks"))}</p>`}
        </article>
      </section>`;

    $$("[data-task]", root).forEach((cb) =>
      cb.addEventListener("change", () => {
        const p = st.plan.find((x) => x.id === cb.dataset.task);
        if (!p) return;
        p.done = cb.checked;
        if (p.done) M.store.log("tasks", 1);
        M.store.save();
        cb.closest("li").classList.toggle("done", p.done);
        if (p.done) M.ui.toast(M.t("home.taskDone"), "good");
      })
    );
  };

  M.views.home = { render };
})();
