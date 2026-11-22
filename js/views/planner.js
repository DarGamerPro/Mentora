(() => {
  const { $, $$, icon, esc, uid, today, addDays, daysBetween, fmtDate, relDay } = M.util;
  let showDone = false;
  let form = { type: "exam", title: "", subjectId: "", date: "", minutes: 30 };

  const render = (root) => {
    const st = M.store.state;
    const t = today();
    if (!form.date) form.date = addDays(t, 7);
    if (!form.subjectId && st.subjects[0]) form.subjectId = st.subjects[0].id;
    const exams = M.store.upcomingExams();
    const pastExams = st.plan.filter((p) => p.type === "exam" && p.date < t).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    const tasks = st.plan
      .filter((p) => p.type === "task" && (showDone || !p.done) && (p.date >= t || !p.done))
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done));
    const groups = [];
    for (const p of tasks) {
      const key = p.date < t ? "overdue" : p.date;
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, items: [] }));
      g.items.push(p);
    }

    root.innerHTML = `
      <header class="page-head rise">
        <div><p class="eyebrow">${esc(M.t("planner.eyebrow"))}</p><h1>${esc(M.t("nav.planner"))}</h1></div>
      </header>
      <div class="planner">
        <div class="planner-left">
          <section class="card rise" style="--i:1">
            <div class="card-head"><h3>${esc(M.t("planner.add"))}</h3></div>
            <div class="form">
              <div class="seg" role="group">
                <button data-type="exam" class="${form.type === "exam" ? "on" : ""}">${icon("target", 15)}<span>${esc(M.t("planner.exam"))}</span></button>
                <button data-type="task" class="${form.type === "task" ? "on" : ""}">${icon("check", 15)}<span>${esc(M.t("planner.task"))}</span></button>
              </div>
              <label class="field"><span>${esc(M.t("planner.title"))}</span><input class="input" data-f="title" maxlength="90" value="${esc(form.title)}" placeholder="${esc(form.type === "exam" ? M.t("planner.examPh") : M.t("planner.taskPh"))}"></label>
              <div class="field-row">
                <label class="field"><span>${esc(M.t("common.subject"))}</span><select class="input" data-f="subjectId"><option value="">${esc(M.t("common.general"))}</option>${st.subjects.map((s) => `<option value="${s.id}" ${form.subjectId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
                <label class="field"><span>${esc(M.t("planner.date"))}</span><input class="input" type="date" data-f="date" min="${t}" value="${esc(form.date)}"></label>
                ${form.type === "task" ? `<label class="field narrow"><span>${esc(M.t("unit.min"))}</span><input class="input" type="number" min="5" max="240" step="5" data-f="minutes" value="${form.minutes}"></label>` : ""}
              </div>
              <button class="btn primary block" data-add>${icon("plus", 16)}<span>${esc(form.type === "exam" ? M.t("planner.addExam") : M.t("planner.addTask"))}</span></button>
              ${form.type === "exam" ? `<p class="muted small">${esc(M.t("planner.autoHint"))}</p>` : ""}
            </div>
          </section>
          <section class="card rise" style="--i:2">
            <div class="card-head"><h3>${esc(M.t("planner.exams"))}</h3></div>
            ${exams.length ? `<ul class="exam-cards">${exams.map((e) => examHtml(e, t)).join("")}</ul>` : `<p class="muted">${esc(M.t("home.noExams"))}</p>`}
            ${pastExams.length ? `<details class="past"><summary class="muted small">${esc(M.t("planner.past"))}</summary><ul class="exam-cards past-list">${pastExams.map((e) => examHtml(e, t, true)).join("")}</ul></details>` : ""}
          </section>
        </div>
        <section class="card schedule rise" style="--i:3">
          <div class="card-head">
            <h3>${esc(M.t("planner.schedule"))}</h3>
            <label class="toggle"><input type="checkbox" data-showdone ${showDone ? "checked" : ""}><span class="tg"></span><span>${esc(M.t("planner.showDone"))}</span></label>
          </div>
          ${groups.length ? groups
            .map((g) => `<div class="day-group${g.key === "overdue" ? " overdue" : ""}${g.key === t ? " is-today" : ""}">
              <h4>${esc(g.key === "overdue" ? M.t("planner.overdue") : relDay(g.key))}${g.key !== "overdue" && daysBetween(t, g.key) > 1 && daysBetween(t, g.key) < 7 ? `<small>${esc(fmtDate(g.key, { day: "numeric", month: "long" }))}</small>` : ""}</h4>
              <ul class="task-list">${g.items.map((p) => taskHtml(p)).join("")}</ul>
            </div>`)
            .join("") : `<div class="empty small-empty"><div class="empty-ic">${icon("calendar", 28)}</div><p class="muted">${esc(M.t("planner.empty"))}</p></div>`}
        </section>
      </div>`;

    $$("[data-type]", root).forEach((b) =>
      b.addEventListener("click", () => {
        form.type = b.dataset.type;
        M.app.rerender();
      })
    );
    $$("[data-f]", root).forEach((el) =>
      el.addEventListener("input", () => {
        form[el.dataset.f] = el.dataset.f === "minutes" ? Number(el.value) || 30 : el.value;
      })
    );
    const titleEl = $('[data-f="title"]', root);
    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add();
    });
    const add = () => {
      const title = form.title.trim();
      if (!title) {
        titleEl.focus();
        return M.ui.toast(M.t("planner.needTitle"), "bad");
      }
      if (!M.util.isDay(form.date) || form.date < t) return M.ui.toast(M.t("planner.needDate"), "bad");
      const item = { id: uid(), type: form.type, subjectId: form.subjectId, title, date: form.date, done: false, minutes: form.type === "task" ? M.util.clamp(form.minutes || 30, 5, 240) : 0 };
      st.plan.push(item);
      let extra = "";
      if (item.type === "exam") {
        const n = M.brain.autoPlan(item);
        if (n) extra = " " + M.t("planner.autoAdded", { n });
      }
      M.store.save();
      form.title = "";
      M.ui.toast(M.t(item.type === "exam" ? "planner.examAdded" : "planner.taskAdded") + extra, "good");
      M.app.rerender();
    };
    $("[data-add]", root).addEventListener("click", add);
    $("[data-showdone]", root).addEventListener("change", (e) => {
      showDone = e.target.checked;
      M.app.rerender();
    });
    $$("[data-ptask]", root).forEach((cb) =>
      cb.addEventListener("change", () => {
        const p = st.plan.find((x) => x.id === cb.dataset.ptask);
        if (!p) return;
        p.done = cb.checked;
        if (p.done) M.store.log("tasks", 1);
        M.store.save();
        cb.closest("li").classList.toggle("done", p.done);
      })
    );
    $$("[data-pdel]", root).forEach((b) =>
      b.addEventListener("click", async () => {
        const p = st.plan.find((x) => x.id === b.dataset.pdel);
        if (!p) return;
        if (p.type === "exam") {
          if (!(await M.ui.confirm(M.t("planner.deleteExam", { title: p.title }), { danger: true, ok: M.t("common.delete") }))) return;
          st.plan = st.plan.filter((x) => x.id !== p.id && !(x.examId === p.id && !x.done));
        } else {
          st.plan = st.plan.filter((x) => x.id !== p.id);
        }
        M.store.save();
        M.app.rerender();
      })
    );
    $$("[data-auto]", root).forEach((b) =>
      b.addEventListener("click", () => {
        const exam = st.plan.find((x) => x.id === b.dataset.auto);
        if (!exam) return;
        const n = M.brain.autoPlan(exam);
        M.ui.toast(n ? M.t("planner.autoAdded", { n }) : M.t("planner.autoNone"), n ? "good" : "info");
        M.app.rerender();
      })
    );
    $$("[data-aiplan]", root).forEach((b) =>
      b.addEventListener("click", async () => {
        const exam = st.plan.find((x) => x.id === b.dataset.aiplan);
        if (!exam) return;
        if (!M.ai.hasKey()) return M.app.needKey();
        const days = [];
        for (let d = t; d < exam.date && days.length < 30; d = addDays(d, 1)) days.push(d);
        if (!days.length) return M.ui.toast(M.t("planner.autoNone"));
        b.disabled = true;
        b.classList.add("loading");
        try {
          const topics = st.notes
            .filter((n) => n.subjectId === exam.subjectId)
            .map((n) => `- ${n.title}: ${n.body.replace(/\s+/g, " ").slice(0, 400)}`)
            .join("\n");
          const sessions = await M.ai.makePlan({ exam, subject: M.store.subjectName(exam.subjectId), days, minutesPerDay: 60, topics });
          if (!sessions.length) throw new M.ai.AIError("format");
          st.plan = st.plan.filter((p) => !(p.auto && p.examId === exam.id && !p.done));
          for (const s of sessions) st.plan.push({ id: uid(), type: "task", subjectId: exam.subjectId, title: s.title, date: s.date, done: false, minutes: s.minutes, examId: exam.id, auto: true, ai: true });
          M.store.save();
          M.ui.toast(M.t("planner.aiAdded", { n: sessions.length }), "good");
          M.app.rerender();
        } catch (err) {
          M.ui.toast(M.ai.errorText(err), "bad", 5000);
          b.disabled = false;
          b.classList.remove("loading");
        }
      })
    );
  };

  const examHtml = (e, t, past) => {
    const d = daysBetween(t, e.date);
    const linked = M.store.state.plan.filter((p) => p.examId === e.id);
    const doneN = linked.filter((p) => p.done).length;
    return `<li class="exam-card" style="--c:${esc(M.store.subjectColor(e.subjectId))}">
      <div class="ec-top">
        <span class="date-chip"><b>${esc(fmtDate(e.date, { day: "numeric" }))}</b><small>${esc(fmtDate(e.date, { month: "short" }).replace(".", ""))}</small></span>
        <span class="exam-main"><span class="exam-title">${esc(e.title)}</span><span class="muted small"><span class="dot" style="--c:${esc(M.store.subjectColor(e.subjectId))}"></span>${esc(M.store.subjectName(e.subjectId))}${linked.length ? ` · ${esc(M.t("planner.sessionsDone", { d: doneN, n: linked.length }))}` : ""}</span></span>
        ${past ? "" : `<span class="badge ${d <= 3 ? "bad" : d <= 7 ? "warn" : ""}">${esc(d === 0 ? M.t("day.today") : M.t("home.inDays", { n: d }))}</span>`}
      </div>
      ${past ? "" : `<div class="ec-actions">
        <button class="btn ghost sm" data-auto="${e.id}" title="${esc(M.t("planner.autoHelp"))}">${icon("wand", 14)}<span>${esc(M.t("planner.auto"))}</span></button>
        <button class="btn soft sm" data-aiplan="${e.id}">${icon("sparkle", 14)}<span>${esc(M.t("planner.aiPlan"))}</span></button>
        <span class="spacer"></span>
        <button class="icon-btn sm" data-pdel="${e.id}" title="${esc(M.t("common.delete"))}" aria-label="${esc(M.t("common.delete"))}">${icon("trash", 14)}</button>
      </div>`}
    </li>`;
  };

  const taskHtml = (p) => `<li class="${p.done ? "done" : ""}">
      <label class="check"><input type="checkbox" data-ptask="${p.id}" ${p.done ? "checked" : ""}><span>${esc(p.title)}</span></label>
      <span class="task-meta">
        ${p.ai ? `<span class="badge accent" title="AI">${icon("sparkle", 11)}</span>` : ""}
        <span class="dot" style="--c:${esc(M.store.subjectColor(p.subjectId))}" title="${esc(M.store.subjectName(p.subjectId))}"></span>
        ${p.minutes ? `<span class="muted small">${p.minutes} ${esc(M.t("unit.min"))}</span>` : ""}
        <button class="icon-btn sm" data-pdel="${p.id}" title="${esc(M.t("common.delete"))}" aria-label="${esc(M.t("common.delete"))}">${icon("x", 14)}</button>
      </span>
    </li>`;

  M.views.planner = { render };
})();
