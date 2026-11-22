(() => {
  const { $, $$, icon, esc, uid, md, debounce, relDay, dateKey } = M.util;
  let selectedId = null;
  let filter = { q: "", subject: "" };
  let previewMode = false;

  const notes = () => M.store.state.notes;

  const snippet = (body) => String(body || "").replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);

  const listHtml = () => {
    const q = filter.q.toLowerCase();
    const items = notes()
      .filter((n) => (!filter.subject || n.subjectId === filter.subject) && (!q || `${n.title} ${n.body}`.toLowerCase().includes(q)))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
    if (!items.length) return `<p class="muted small pad">${esc(notes().length ? M.t("notes.noMatch") : M.t("notes.none"))}</p>`;
    return items
      .map(
        (n) => `<button class="note-item${n.id === selectedId ? " active" : ""}" data-note="${n.id}">
          <span class="ni-title">${esc(n.title || M.t("notes.untitled"))}</span>
          <span class="ni-snip">${esc(snippet(n.body) || M.t("notes.empty"))}</span>
          <span class="ni-meta"><span class="dot" style="--c:${esc(M.store.subjectColor(n.subjectId))}"></span>${esc(M.store.subjectName(n.subjectId))} · ${esc(relDay(dateKey(new Date(n.updated || n.created || Date.now()))))}</span>
        </button>`
      )
      .join("");
  };

  const subjectOptions = (sel, withAll) =>
    (withAll ? `<option value="">${esc(M.t("notes.allSubjects"))}</option>` : `<option value="">${esc(M.t("common.general"))}</option>`) +
    M.store.state.subjects.map((s) => `<option value="${s.id}" ${sel === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("");

  const createNote = () => {
    const n = { id: uid(), subjectId: filter.subject || (M.store.state.subjects[0] || {}).id || "", title: "", body: "", created: Date.now(), updated: Date.now() };
    notes().unshift(n);
    selectedId = n.id;
    previewMode = false;
    M.store.save();
    return n;
  };

  const render = (root, query) => {
    if (query.id && notes().some((n) => n.id === query.id)) selectedId = query.id;
    if (query.new) {
      createNote();
      history.replaceState(null, "", "#/notes");
    }
    if (!notes().some((n) => n.id === selectedId)) selectedId = (notes()[0] || {}).id || null;
    const note = notes().find((n) => n.id === selectedId) || null;

    root.innerHTML = `
      <header class="page-head rise">
        <div><p class="eyebrow">${esc(M.t("notes.eyebrow"))}</p><h1>${esc(M.t("nav.notes"))}</h1></div>
        <button class="btn primary" data-new>${icon("plus", 17)}<span>${esc(M.t("notes.new"))}</span></button>
      </header>
      <div class="notes-layout rise" style="--i:1">
        <aside class="card notes-side">
          <div class="search">${icon("search", 16)}<input class="input" type="search" data-q placeholder="${esc(M.t("common.search"))}" value="${esc(filter.q)}"></div>
          <select class="input sm" data-filter>${subjectOptions(filter.subject, true)}</select>
          <div class="note-list">${listHtml()}</div>
        </aside>
        <section class="card note-editor">${note ? editorHtml(note) : `<div class="empty"><div class="empty-ic">${icon("notes", 30)}</div><h2>${esc(M.t("notes.startTitle"))}</h2><p class="muted">${esc(M.t("notes.startText"))}</p><button class="btn primary" data-new>${icon("plus", 17)}<span>${esc(M.t("notes.new"))}</span></button></div>`}</section>
      </div>`;

    const bindList = () => {
      $$("[data-note]", root).forEach((b) =>
        b.addEventListener("click", () => {
          selectedId = b.dataset.note;
          previewMode = false;
          M.app.rerender();
        })
      );
    };
    const refreshList = () => {
      $(".note-list", root).innerHTML = listHtml();
      bindList();
    };
    bindList();
    $$("[data-new]", root).forEach((b) =>
      b.addEventListener("click", () => {
        createNote();
        M.app.rerender();
        setTimeout(() => $(".title-input") && $(".title-input").focus(), 40);
      })
    );
    $("[data-q]", root).addEventListener("input", debounce((e) => {
      filter.q = e.target.value;
      refreshList();
    }, 150));
    $("[data-filter]", root).addEventListener("change", (e) => {
      filter.subject = e.target.value;
      refreshList();
    });

    if (note) bindEditor(root, note, refreshList);
  };

  const editorHtml = (n) => `
    <div class="note-top">
      <input class="title-input" maxlength="120" value="${esc(n.title)}" placeholder="${esc(M.t("notes.titlePh"))}" aria-label="${esc(M.t("notes.titlePh"))}">
      <div class="note-top-row">
        <select class="input sm" data-subj aria-label="${esc(M.t("common.subject"))}">${subjectOptions(n.subjectId, false)}</select>
        <div class="seg seg-sm" role="group">
          <button data-pm="0" class="${previewMode ? "" : "on"}">${icon("edit", 14)}<span>${esc(M.t("notes.write"))}</span></button>
          <button data-pm="1" class="${previewMode ? "on" : ""}">${icon("eye", 14)}<span>${esc(M.t("notes.preview"))}</span></button>
        </div>
        <span class="saved muted small" data-saved>${icon("check", 14)} ${esc(M.t("notes.saved"))}</span>
        <button class="icon-btn" data-del title="${esc(M.t("common.delete"))}" aria-label="${esc(M.t("common.delete"))}">${icon("trash", 17)}</button>
      </div>
    </div>
    ${previewMode ? `<div class="note-preview prose">${n.body.trim() ? md(n.body) : `<p class="muted">${esc(M.t("notes.empty"))}</p>`}</div>` : `<textarea class="note-body" spellcheck="true" placeholder="${esc(M.t("notes.bodyPh"))}">${esc(n.body)}</textarea>`}
    <div class="note-actions">
      <span class="ai-label">${icon("sparkle", 15)} ${esc(M.t("notes.aiTools"))}</span>
      <button class="btn soft sm" data-ai="summary">${icon("book", 15)}<span>${esc(M.t("notes.summarize"))}</span></button>
      <button class="btn soft sm" data-ai="cards">${icon("cards", 15)}<span>${esc(M.t("notes.makeCards"))}</span></button>
      <button class="btn soft sm" data-ai="quiz">${icon("quiz", 15)}<span>${esc(M.t("notes.quizMe"))}</span></button>
      <span class="spacer"></span>
      <button class="btn ghost sm" data-extract title="${esc(M.t("notes.extractHelp"))}">${icon("wand", 15)}<span>${esc(M.t("notes.extract"))}</span></button>
    </div>
    <div class="note-summary" hidden></div>`;

  const bindEditor = (root, n, refreshList) => {
    const titleEl = $(".title-input", root);
    const bodyEl = $(".note-body", root);
    const savedEl = $("[data-saved]", root);
    const touch = debounce(() => {
      n.updated = Date.now();
      M.store.save();
      savedEl.classList.add("flash");
      setTimeout(() => savedEl.classList.remove("flash"), 600);
      refreshList();
    }, 400);
    titleEl.addEventListener("input", () => {
      n.title = titleEl.value;
      touch();
    });
    if (bodyEl) {
      bodyEl.addEventListener("input", () => {
        n.body = bodyEl.value;
        touch();
      });
      bodyEl.addEventListener("keydown", (e) => {
        if (e.key === "Tab" && !e.shiftKey) {
          e.preventDefault();
          const s = bodyEl.selectionStart;
          bodyEl.setRangeText("  ", s, bodyEl.selectionEnd, "end");
          n.body = bodyEl.value;
          touch();
        }
      });
    }
    $("[data-subj]", root).addEventListener("change", (e) => {
      n.subjectId = e.target.value;
      touch();
    });
    $$("[data-pm]", root).forEach((b) =>
      b.addEventListener("click", () => {
        previewMode = b.dataset.pm === "1";
        M.app.rerender();
      })
    );
    $("[data-del]", root).addEventListener("click", async () => {
      if (!(await M.ui.confirm(M.t("notes.deleteConfirm", { title: n.title || M.t("notes.untitled") }), { danger: true, ok: M.t("common.delete") }))) return;
      M.store.state.notes = notes().filter((x) => x.id !== n.id);
      selectedId = null;
      M.store.save();
      M.app.rerender();
    });

    const material = () => `${n.title}\n\n${n.body}`.trim();
    const tooShort = () => {
      if (n.body.trim().length < 20) {
        M.ui.toast(M.t("notes.tooShort"), "bad");
        return true;
      }
      return false;
    };

    $("[data-extract]", root).addEventListener("click", () => {
      if (tooShort()) return;
      const cards = M.brain.extractCards(n.body);
      if (!cards.length) return M.ui.toast(M.t("notes.extractNone"), "bad", 4500);
      M.views.cards.preview(cards, n.subjectId);
    });

    const summaryEl = $(".note-summary", root);
    $$("[data-ai]", root).forEach((b) =>
      b.addEventListener("click", async () => {
        const kind = b.dataset.ai;
        if (tooShort()) return;
        if (kind === "quiz") {
          location.hash = `#/quiz?note=${n.id}`;
          return;
        }
        if (!M.ai.hasKey()) {
          if (kind === "cards") {
            const cards = M.brain.extractCards(n.body);
            if (cards.length) {
              M.ui.toast(M.t("notes.offlineUsed"));
              return M.views.cards.preview(cards, n.subjectId);
            }
          }
          return M.app.needKey();
        }
        b.disabled = true;
        b.classList.add("loading");
        try {
          if (kind === "summary") {
            const text = await M.ai.summarize(n.title || M.t("notes.untitled"), n.body);
            summaryEl.hidden = false;
            summaryEl.innerHTML = `<div class="summary-head"><b>${icon("sparkle", 15)} ${esc(M.t("notes.summaryTitle"))}</b><span class="spacer"></span><button class="btn soft sm" data-insert>${icon("plus", 14)}<span>${esc(M.t("notes.insert"))}</span></button><button class="icon-btn sm" data-close-sum aria-label="${esc(M.t("common.close"))}">${icon("x", 14)}</button></div><div class="prose">${md(text)}</div>`;
            $("[data-insert]", summaryEl).addEventListener("click", () => {
              n.body = `${n.body.trimEnd()}\n\n## ${M.t("notes.summaryTitle")}\n${text.trim()}\n`;
              n.updated = Date.now();
              M.store.save();
              M.app.rerender();
              M.ui.toast(M.t("notes.inserted"), "good");
            });
            $("[data-close-sum]", summaryEl).addEventListener("click", () => {
              summaryEl.hidden = true;
            });
            summaryEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
          } else if (kind === "cards") {
            const cards = await M.ai.makeCards(material(), 10);
            M.views.cards.preview(cards, n.subjectId);
          }
        } catch (err) {
          M.ui.toast(M.ai.errorText(err), "bad", 5000);
        } finally {
          b.disabled = false;
          b.classList.remove("loading");
        }
      })
    );
  };

  M.views.notes = { render };
})();
