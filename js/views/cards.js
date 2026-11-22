(() => {
  const { $, $$, icon, esc, uid, relDay, today, debounce } = M.util;
  let filter = { subject: "", q: "" };

  const subjectSelect = (sel, attr = "data-csubj") =>
    `<select class="input" ${attr}>${[`<option value="">${esc(M.t("common.general"))}</option>`]
      .concat(M.store.state.subjects.map((s) => `<option value="${s.id}" ${sel === s.id ? "selected" : ""}>${esc(s.name)}</option>`))
      .join("")}</select>`;

  const statusBadge = (c) => {
    const s = M.srs.status(c);
    return `<span class="badge ${s === "mastered" ? "good" : s === "new" ? "accent" : ""}">${esc(M.t(`cards.status.${s}`))}</span>`;
  };

  const editCard = (card, presetSubject) => {
    const isNew = !card;
    const c = card || { subjectId: presetSubject || filter.subject || "", front: "", back: "" };
    M.ui.modal({
      title: isNew ? M.t("cards.addTitle") : M.t("cards.editTitle"),
      body: `<div class="form">
        <label class="field"><span>${esc(M.t("common.subject"))}</span>${subjectSelect(c.subjectId)}</label>
        <label class="field"><span>${esc(M.t("cards.front"))}</span><textarea class="input" data-front rows="2" maxlength="400" placeholder="${esc(M.t("cards.frontPh"))}">${esc(c.front)}</textarea></label>
        <label class="field"><span>${esc(M.t("cards.back"))}</span><textarea class="input" data-back rows="3" maxlength="600" placeholder="${esc(M.t("cards.backPh"))}">${esc(c.back)}</textarea></label>
      </div>`,
      actions: [
        ...(isNew ? [{ label: M.t("cards.saveAnother"), kind: "ghost", onClick: (el) => save(el, true) }] : []),
        { label: M.t("common.save"), kind: "primary", icon: "check", onClick: (el) => save(el, false) },
      ],
    });
    function save(el, again) {
      const front = $("[data-front]", el).value.trim();
      const back = $("[data-back]", el).value.trim();
      const subjectId = $("[data-csubj]", el).value;
      if (!front || !back) {
        M.ui.toast(M.t("cards.fillBoth"), "bad");
        return false;
      }
      if (isNew) {
        M.store.state.cards.push({ id: uid(), subjectId, front, back, reps: 0, interval: 0, ease: 2.5, lapses: 0, due: today(), lastReviewed: null, created: Date.now() });
      } else {
        Object.assign(card, { front, back, subjectId });
      }
      M.store.save();
      M.ui.toast(isNew ? M.t("cards.added") : M.t("cards.saved"), "good");
      if (location.hash.startsWith("#/cards")) M.app.rerender();
      else M.app.updateBadges();
      if (again) {
        setTimeout(() => editCard(null, subjectId), 200);
      }
      return true;
    }
  };

  const preview = (cards, subjectId) => {
    const rows = cards
      .map(
        (c, i) => `<div class="pv-row">
          <label class="check"><input type="checkbox" data-pv="${i}" checked><span class="sr-only">${i + 1}</span></label>
          <input class="input" data-pf="${i}" value="${esc(c.front)}" maxlength="400" aria-label="${esc(M.t("cards.front"))}">
          <input class="input" data-pb="${i}" value="${esc(c.back)}" maxlength="600" aria-label="${esc(M.t("cards.back"))}">
        </div>`
      )
      .join("");
    M.ui.modal({
      title: M.t("cards.previewTitle", { n: cards.length }),
      wide: true,
      body: `<p class="muted">${esc(M.t("cards.previewText"))}</p>
        <label class="field inline"><span>${esc(M.t("common.subject"))}</span>${subjectSelect(subjectId || "")}</label>
        <div class="pv-head"><span></span><span>${esc(M.t("cards.front"))}</span><span>${esc(M.t("cards.back"))}</span></div>
        <div class="pv-list">${rows}</div>`,
      actions: [
        { label: M.t("common.cancel"), kind: "ghost" },
        {
          label: M.t("cards.addSelected"),
          kind: "primary",
          icon: "plus",
          onClick: (el) => {
            const sid = $("[data-csubj]", el).value;
            let n = 0;
            cards.forEach((_, i) => {
              if (!$(`[data-pv="${i}"]`, el).checked) return;
              const front = $(`[data-pf="${i}"]`, el).value.trim();
              const back = $(`[data-pb="${i}"]`, el).value.trim();
              if (!front || !back) return;
              M.store.state.cards.push({ id: uid(), subjectId: sid, front, back, reps: 0, interval: 0, ease: 2.5, lapses: 0, due: today(), lastReviewed: null, created: Date.now() });
              n++;
            });
            if (!n) {
              M.ui.toast(M.t("cards.noneSelected"), "bad");
              return false;
            }
            M.store.save();
            M.app.updateBadges();
            M.ui.toast(M.t("cards.addedN", { n }), "good");
            if (location.hash.startsWith("#/cards") || location.hash.startsWith("#/home") || !location.hash) M.app.rerender();
            return true;
          },
        },
      ],
    });
  };

  const render = (root, query) => {
    if (query.subject !== undefined) filter.subject = query.subject;
    const st = M.store.state;
    const all = M.store.cardsOf(filter.subject || null);
    const counts = { new: 0, learning: 0, mastered: 0 };
    all.forEach((c) => counts[M.srs.status(c)]++);
    const due = M.store.dueCards(filter.subject || null).length;
    const q = filter.q.toLowerCase();
    const list = all.filter((c) => !q || `${c.front} ${c.back}`.toLowerCase().includes(q)).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
    const total = all.length || 1;

    root.innerHTML = `
      <header class="page-head rise">
        <div><p class="eyebrow">${esc(M.t("cards.eyebrow"))}</p><h1>${esc(M.t("nav.cards"))}</h1></div>
        <div class="head-actions">
          <button class="btn ghost" data-add>${icon("plus", 17)}<span>${esc(M.t("cards.add"))}</span></button>
          <a class="btn primary${due ? "" : " disabled"}" href="#/review${filter.subject ? `?subject=${filter.subject}` : ""}" ${due ? "" : 'aria-disabled="true" tabindex="-1"'}>${icon("play", 16)}<span>${esc(M.t("cards.review", { n: due }))}</span></a>
        </div>
      </header>
      <div class="tabs rise" style="--i:1" role="tablist">
        <button class="tab${!filter.subject ? " on" : ""}" data-tab="">${esc(M.t("cards.all"))} <em>${st.cards.length}</em></button>
        ${st.subjects.map((s) => `<button class="tab${filter.subject === s.id ? " on" : ""}" data-tab="${s.id}"><span class="dot" style="--c:${esc(s.color)}"></span>${esc(s.name)} <em>${M.store.cardsOf(s.id).length}</em></button>`).join("")}
      </div>
      <section class="grid deck-stats rise" style="--i:2">
        <div class="card mini-stat span-3"><span class="ms-num">${due}</span><span class="ms-lbl">${esc(M.t("cards.dueToday"))}</span></div>
        <div class="card mini-stat span-3"><span class="ms-num accent">${counts.new}</span><span class="ms-lbl">${esc(M.t("cards.stat.new"))}</span></div>
        <div class="card mini-stat span-3"><span class="ms-num warn">${counts.learning}</span><span class="ms-lbl">${esc(M.t("cards.stat.learning"))}</span></div>
        <div class="card mini-stat span-3"><span class="ms-num good">${counts.mastered}</span><span class="ms-lbl">${esc(M.t("cards.stat.mastered"))}</span></div>
        <div class="stack-bar span-12" aria-hidden="true"><span class="sb-new" style="width:${(counts.new / total) * 100}%"></span><span class="sb-learning" style="width:${(counts.learning / total) * 100}%"></span><span class="sb-mastered" style="width:${(counts.mastered / total) * 100}%"></span></div>
      </section>
      <section class="card rise" style="--i:3">
        <div class="card-head">
          <div class="search grow">${icon("search", 16)}<input class="input" type="search" data-q placeholder="${esc(M.t("cards.search"))}" value="${esc(filter.q)}"></div>
        </div>
        <div class="card-table">${list.length ? list.map(rowHtml).join("") : `<div class="empty small-empty"><p class="muted">${esc(all.length ? M.t("cards.noMatch") : M.t("cards.none"))}</p>${all.length ? "" : `<div class="row-gap"><button class="btn primary sm" data-add>${icon("plus", 15)}<span>${esc(M.t("cards.add"))}</span></button><a class="btn ghost sm" href="#/notes">${icon("notes", 15)}<span>${esc(M.t("cards.fromNotes"))}</span></a></div>`}</div>`}</div>
      </section>`;

    $$("[data-tab]", root).forEach((b) =>
      b.addEventListener("click", () => {
        filter.subject = b.dataset.tab;
        M.app.rerender();
      })
    );
    $$("[data-add]", root).forEach((b) => b.addEventListener("click", () => editCard(null)));
    const qEl = $("[data-q]", root);
    qEl.addEventListener("input", debounce(() => {
      filter.q = qEl.value;
      const pos = qEl.selectionStart;
      M.app.rerender();
      const again = $("[data-q]");
      if (again) {
        again.focus();
        again.setSelectionRange(pos, pos);
      }
    }, 200));
    $$("[data-edit]", root).forEach((b) => b.addEventListener("click", () => editCard(st.cards.find((c) => c.id === b.dataset.edit))));
    $$("[data-delc]", root).forEach((b) =>
      b.addEventListener("click", async () => {
        if (!(await M.ui.confirm(M.t("cards.deleteConfirm"), { danger: true, ok: M.t("common.delete") }))) return;
        st.cards = st.cards.filter((c) => c.id !== b.dataset.delc);
        M.store.save();
        M.app.rerender();
      })
    );
  };

  const rowHtml = (c) => `<div class="card-row">
      <span class="dot" style="--c:${esc(M.store.subjectColor(c.subjectId))}" title="${esc(M.store.subjectName(c.subjectId))}"></span>
      <span class="cr-front">${esc(c.front)}</span>
      <span class="cr-back muted">${esc(c.back)}</span>
      ${statusBadge(c)}
      <span class="cr-due small muted">${esc(!c.due || c.due <= today() ? M.t("cards.dueNow") : relDay(c.due))}</span>
      <span class="cr-tools">
        <button class="icon-btn sm" data-edit="${c.id}" title="${esc(M.t("common.edit"))}" aria-label="${esc(M.t("common.edit"))}">${icon("edit", 15)}</button>
        <button class="icon-btn sm" data-delc="${c.id}" title="${esc(M.t("common.delete"))}" aria-label="${esc(M.t("common.delete"))}">${icon("trash", 15)}</button>
      </span>
    </div>`;

  M.views.cards = { render, preview, editCard };

  const review = (root, query) => {
    const subjectId = query.subject || "";
    const queue = M.srs.queue(subjectId || null);
    const total = queue.length;
    const again = new Map();
    const stats = { reviewed: 0, good: 0, start: Date.now() };
    let current = null;
    let flipped = false;

    if (!total) {
      const upcoming = M.store.cardsOf(subjectId || null).filter((c) => c.due).sort((a, b) => a.due.localeCompare(b.due))[0];
      root.innerHTML = `<div class="review-done card rise">
        <div class="done-badge">${icon("check", 34)}</div>
        <h1>${esc(M.t("review.caught"))}</h1>
        <p class="muted">${esc(upcoming ? M.t("review.nextDue", { when: relDay(upcoming.due) }) : M.t("review.noCards"))}</p>
        <div class="row-gap center"><a class="btn ghost" href="#/cards">${icon("back", 16)}<span>${esc(M.t("review.back"))}</span></a><a class="btn primary" href="#/quiz${subjectId ? `?subject=${subjectId}` : ""}">${icon("quiz", 16)}<span>${esc(M.t("review.quizInstead"))}</span></a></div>
      </div>`;
      return;
    }

    root.innerHTML = `<div class="review rise">
      <div class="review-top">
        <a class="btn ghost sm" href="#/cards">${icon("back", 15)}<span>${esc(M.t("review.back"))}</span></a>
        <span class="review-count" data-count></span>
        <span class="muted small">${esc(subjectId ? M.store.subjectName(subjectId) : M.t("cards.all"))}</span>
      </div>
      <div class="progress"><span data-prog></span></div>
      <div class="flip-wrap">
        <button class="flip-card" data-flip aria-live="polite">
          <span class="face front"><span class="face-tag" data-ftag></span><span class="face-text" data-ftext></span><span class="face-hint">${icon("flip", 15)} ${esc(M.t("review.flipHint"))}</span></span>
          <span class="face back"><span class="face-tag">${esc(M.t("cards.back"))}</span><span class="face-text" data-btext></span></span>
        </button>
      </div>
      <div class="rate" data-rate hidden>
        ${[0, 1, 2, 3].map((r) => `<button class="rate-btn r${r}" data-r="${r}"><b>${esc(M.t(`review.r${r}`))}</b><small data-iv="${r}"></small><kbd>${r + 1}</kbd></button>`).join("")}
      </div>
      <div class="rate-wait" data-wait><button class="btn primary big" data-show>${esc(M.t("review.show"))} <kbd>Space</kbd></button></div>
    </div>`;

    const card = $("[data-flip]", root);
    const show = () => {
      if (!current) return;
      flipped = true;
      card.classList.add("flipped");
      $("[data-rate]", root).hidden = false;
      $("[data-wait]", root).hidden = true;
      const iv = M.srs.preview(current);
      iv.forEach((d, r) => {
        $(`[data-iv="${r}"]`, root).textContent = M.srs.label(d);
      });
      const first = $('[data-r="2"]', root);
      if (first) first.focus({ preventScroll: true });
    };
    const nextCard = () => {
      current = queue.shift() || null;
      if (!current) return finish();
      flipped = false;
      card.classList.remove("flipped");
      card.classList.remove("enter");
      void card.offsetWidth;
      card.classList.add("enter");
      $("[data-rate]", root).hidden = true;
      $("[data-wait]", root).hidden = false;
      $("[data-ftag]", root).innerHTML = `<span class="dot" style="--c:${esc(M.store.subjectColor(current.subjectId))}"></span>${esc(M.store.subjectName(current.subjectId))} · ${esc(M.t(`cards.status.${M.srs.status(current)}`))}`;
      $("[data-ftext]", root).textContent = current.front;
      $("[data-btext]", root).textContent = current.back;
      const done = total - queue.length - 1;
      $("[data-count]", root).textContent = `${Math.min(done + 1, total)} / ${total}`;
      $("[data-prog]", root).style.width = `${(stats.reviewed / Math.max(1, stats.reviewed + queue.length + 1)) * 100}%`;
    };
    const rate = (r) => {
      if (!current || !flipped) return;
      M.srs.apply(current, r);
      stats.reviewed++;
      if (r >= 2) stats.good++;
      M.store.log("cards", 1);
      if (r === 0) {
        const n = again.get(current.id) || 0;
        if (n < 2) {
          again.set(current.id, n + 1);
          queue.push(current);
        }
      }
      M.store.save();
      nextCard();
    };
    const finish = () => {
      current = null;
      const mins = Math.max(1, Math.round((Date.now() - stats.start) / 60000));
      const pct = stats.reviewed ? Math.round((stats.good / stats.reviewed) * 100) : 0;
      M.app.updateBadges();
      root.innerHTML = `<div class="review-done card rise">
        <div class="done-badge">${icon("check", 34)}</div>
        <h1>${esc(M.t("review.finished"))}</h1>
        <div class="done-stats">
          <div><b>${stats.reviewed}</b><span>${esc(M.t("review.reviewed"))}</span></div>
          <div><b>${pct}%</b><span>${esc(M.t("review.remembered"))}</span></div>
          <div><b>${mins}</b><span>${esc(M.t("unit.min"))}</span></div>
        </div>
        <div class="row-gap center"><a class="btn ghost" href="#/cards">${icon("back", 16)}<span>${esc(M.t("review.back"))}</span></a><a class="btn primary" href="#/home">${icon("home", 16)}<span>${esc(M.t("nav.home"))}</span></a></div>
      </div>`;
      M.ui.toast(M.t("review.toast", { n: stats.reviewed }), "good");
    };

    card.addEventListener("click", () => (flipped ? null : show()));
    $("[data-show]", root).addEventListener("click", show);
    $$("[data-r]", root).forEach((b) => b.addEventListener("click", () => rate(Number(b.dataset.r))));
    const onKey = (e) => {
      if (e.target.closest("input, textarea, select") || document.querySelector(".modal-back")) return;
      if (e.key === " " || e.key === "Enter") {
        if (!flipped) {
          e.preventDefault();
          show();
        } else if (e.key === " ") {
          e.preventDefault();
          rate(2);
        }
      } else if (/^[1-4]$/.test(e.key) && flipped) {
        e.preventDefault();
        rate(Number(e.key) - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    nextCard();
    return () => document.removeEventListener("keydown", onKey);
  };

  M.views.review = { render: review };
})();
