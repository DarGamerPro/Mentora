(() => {
  const { $, $$, icon, esc, uid, md, autosize, relDay, today } = M.util;
  const MODES = [
    ["explain", "book"],
    ["socratic", "target"],
    ["quiz", "quiz"],
    ["simple", "sparkle"],
  ];

  let current = null;
  let busy = false;
  let controller = null;

  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  const newDraft = (prev) => ({
    id: uid(),
    title: "",
    mode: prev ? prev.mode : "explain",
    subjectId: prev ? prev.subjectId : "",
    useNotes: prev ? prev.useNotes : true,
    messages: [],
    created: Date.now(),
    updated: Date.now(),
    textOnly: false,
    sysKey: "",
    draft: true,
  });

  const chats = () => M.store.state.chats;

  const persist = (chat) => {
    if (chat.draft) {
      delete chat.draft;
      chats().unshift(chat);
    }
    chat.updated = Date.now();
    M.store.save();
  };

  const msgHtml = (m, idx) => {
    if (m.role === "user") return `<div class="msg user" data-i="${idx}"><div class="bubble">${esc(m.content).replace(/\n/g, "<br>")}</div></div>`;
    const cls = m.error ? " error" : m.offline ? " offline" : "";
    const tag = m.offline ? `<span class="badge">${icon("bolt", 12)} ${esc(M.t("tutor.offlineTag"))}</span>` : m.partial ? `<span class="badge">${esc(M.t("tutor.stopped"))}</span>` : "";
    const tools = m.error
      ? `<button class="btn soft sm" data-retry>${icon("reset", 15)}<span>${esc(M.t("tutor.retry"))}</span></button>`
      : `<button class="icon-btn sm" data-copy="${idx}" title="${esc(M.t("tutor.copy"))}" aria-label="${esc(M.t("tutor.copy"))}">${icon("copy", 15)}</button>
         <button class="btn soft sm" data-tocards="${idx}">${icon("cards", 15)}<span>${esc(M.t("tutor.toCards"))}</span></button>`;
    return `<div class="msg bot${cls}" data-i="${idx}">
      <div class="avatar">${icon(m.error ? "x" : "sparkle", 16)}</div>
      <div class="bot-body">${tag}<div class="prose">${m.error ? `<p>${esc(m.content)}</p>` : md(m.content)}</div><div class="msg-tools">${tools}</div></div>
    </div>`;
  };

  const emptyHtml = () => {
    const ideas = M.t("tutor.ideas").split("|");
    return `<div class="chat-empty">
      <div class="chat-empty-logo">${M.app.LOGO}</div>
      <h2>${esc(M.t("tutor.emptyTitle"))}</h2>
      <p class="muted">${esc(M.t(`tutor.modeHelp.${current.mode}`))}</p>
      <div class="ideas">${ideas.map((q) => `<button class="idea" data-idea="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    </div>`;
  };

  const listHtml = () =>
    (current.draft ? `<div class="chat-item active"><span class="ci-title">${esc(M.t("tutor.newChat"))}</span></div>` : "") +
    chats()
      .map((c) => `<div class="chat-item${c === current ? " active" : ""}" data-open="${c.id}" tabindex="0" role="button">
        <span class="ci-title">${esc(c.title || M.t("tutor.newChat"))}</span>
        <span class="ci-meta">${c.subjectId ? `<span class="dot" style="--c:${esc(M.store.subjectColor(c.subjectId))}"></span>` : ""}${esc(M.t(`tutor.mode.${c.mode}`))} · ${esc(relDay(M.util.dateKey(new Date(c.updated))))}</span>
        <button class="icon-btn sm ci-del" data-del="${c.id}" title="${esc(M.t("common.delete"))}" aria-label="${esc(M.t("common.delete"))}">${icon("trash", 14)}</button>
      </div>`)
      .join("");

  const render = (root, query) => {
    if (query.chat) {
      const found = chats().find((c) => c.id === query.chat);
      if (found) current = found;
    }
    if (!current || (!current.draft && !chats().includes(current))) current = chats()[0] || newDraft();
    const st = M.store.state;
    const hasKey = M.ai.hasKey();

    root.innerHTML = `
      <div class="tutor rise">
        <aside class="chat-list card">
          <button class="btn primary block" data-new>${icon("plus", 17)}<span>${esc(M.t("tutor.new"))}</span></button>
          <div class="chat-items">${listHtml()}</div>
        </aside>
        <section class="chat card">
          <header class="chat-head">
            <div class="seg modes" role="group" aria-label="${esc(M.t("tutor.modeLabel"))}">
              ${MODES.map(([m, ic]) => `<button data-mode="${m}" class="${current.mode === m ? "on" : ""}" title="${esc(M.t(`tutor.modeHelp.${m}`))}">${icon(ic, 15)}<span>${esc(M.t(`tutor.mode.${m}`))}</span></button>`).join("")}
            </div>
            <div class="chat-tools">
              <select class="input sm" data-subject aria-label="${esc(M.t("common.subject"))}">
                <option value="">${esc(M.t("tutor.anySubject"))}</option>
                ${st.subjects.map((s) => `<option value="${s.id}" ${current.subjectId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}
              </select>
              <label class="toggle" title="${esc(M.t("tutor.useNotesHelp"))}"><input type="checkbox" data-notes ${current.useNotes ? "checked" : ""} ${current.subjectId ? "" : "disabled"}><span class="tg"></span><span>${esc(M.t("tutor.useNotes"))}</span></label>
            </div>
          </header>
          ${hasKey ? "" : `<div class="banner">${icon("bolt", 16)}<span>${esc(M.t("tutor.offlineBanner"))}</span><button class="btn soft sm" data-key>${icon("key", 14)}<span>${esc(M.t("tutor.addKey"))}</span></button></div>`}
          <div class="msgs" id="msgs" aria-live="polite">${current.messages.length ? current.messages.map(msgHtml).join("") : emptyHtml()}</div>
          <form class="composer" autocomplete="off">
            <textarea id="ask" rows="1" maxlength="8000" placeholder="${esc(M.t("tutor.placeholder"))}" aria-label="${esc(M.t("tutor.placeholder"))}"></textarea>
            <button class="btn primary send" type="submit" aria-label="${esc(M.t("tutor.send"))}">${icon("send", 18)}</button>
          </form>
          <p class="composer-hint muted small">${esc(M.t("tutor.hint"))}</p>
        </section>
      </div>`;

    const msgsEl = $("#msgs", root);
    const ta = $("#ask", root);
    const form = $(".composer", root);
    const sendBtn = $(".send", root);
    const scrollDown = () => {
      msgsEl.scrollTop = msgsEl.scrollHeight;
    };
    scrollDown();

    const setBusy = (v) => {
      busy = v;
      M.busy = v;
      sendBtn.innerHTML = v ? icon("stop", 18) : icon("send", 18);
      sendBtn.classList.toggle("stop", v);
      sendBtn.setAttribute("aria-label", v ? M.t("tutor.stop") : M.t("tutor.send"));
      sendBtn.type = v ? "button" : "submit";
    };

    const paint = () => {
      msgsEl.innerHTML = current.messages.length ? current.messages.map(msgHtml).join("") : emptyHtml();
      bindMsgs();
      scrollDown();
    };

    const apiMessages = () => {
      const out = [];
      for (const m of current.messages) {
        if (m.role === "user") out.push({ role: "user", content: m.content });
        else if (!m.error && !m.offline && m.content) {
          out.push({ role: "assistant", content: !current.textOnly && Array.isArray(m.blocks) ? m.blocks : m.content });
        }
      }
      while (out.length && out[out.length - 1].role === "assistant") out.pop();
      return out;
    };

    const respond = async () => {
      const last = current.messages[current.messages.length - 1];
      if (!last || last.role !== "user") return;
      if (!M.ai.hasKey()) {
        current.messages.push({ role: "assistant", content: M.brain.offlineAnswer(last.content, current.subjectId), offline: true });
        persist(current);
        M.store.log("chats", 1);
        paint();
        return;
      }
      const system = M.ai.tutorSystem(current.mode, current.subjectId, current.useNotes && !!current.subjectId);
      const key = hash(system + "|" + M.ai.model());
      if (current.sysKey && current.sysKey !== key) current.textOnly = true;
      current.sysKey = key;

      const live = document.createElement("div");
      live.className = "msg bot streaming";
      live.innerHTML = `<div class="avatar">${icon("sparkle", 16)}</div><div class="bot-body"><div class="prose"><p class="thinking"><span></span><span></span><span></span> ${esc(M.t("tutor.thinking"))}</p></div></div>`;
      const empty = $(".chat-empty", msgsEl);
      if (empty) empty.remove();
      msgsEl.appendChild(live);
      scrollDown();
      const prose = $(".prose", live);
      let buf = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        const nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
        prose.innerHTML = md(buf) + '<span class="caret"></span>';
        if (nearBottom) scrollDown();
      };
      setBusy(true);
      controller = new AbortController();
      const chat = current;
      try {
        const res = await M.ai.chat({
          system,
          messages: apiMessages(),
          signal: controller.signal,
          onText: (d) => {
            buf += d;
            if (!raf) raf = requestAnimationFrame(flush);
          },
        });
        const hasFallback = res.content.some((b) => b.type === "fallback");
        if (hasFallback) chat.textOnly = true;
        chat.messages.push({ role: "assistant", content: res.text || buf, blocks: chat.textOnly ? undefined : res.content });
        M.store.log("chats", 1);
      } catch (err) {
        if (err && err.code === "aborted") {
          chat.textOnly = true;
          if (buf.trim()) chat.messages.push({ role: "assistant", content: buf, partial: true });
        } else {
          if (buf.trim()) chat.textOnly = true;
          chat.messages.push({ role: "assistant", content: M.ai.errorText(err), error: true, code: err && err.code });
        }
      } finally {
        if (raf) cancelAnimationFrame(raf);
        controller = null;
        persist(chat);
        setBusy(false);
        if (chat === current && document.body.contains(msgsEl)) {
          paint();
          refreshList();
        }
      }
    };

    const send = (text) => {
      const q = (text ?? ta.value).trim();
      if (!q || busy) return;
      if (!current.title) current.title = q.length > 52 ? q.slice(0, 50) + "…" : q;
      current.messages.push({ role: "user", content: q });
      persist(current);
      ta.value = "";
      autosize(ta);
      paint();
      refreshList();
      respond();
    };

    const refreshList = () => {
      const list = $(".chat-items", root);
      if (!list) return;
      const scroll = list.scrollTop;
      list.innerHTML = listHtml();
      list.scrollTop = scroll;
      bindList();
    };

    const bindList = () => {
      $$("[data-open]", root).forEach((el) => {
        const open = (e) => {
          if (e.target.closest("[data-del]")) return;
          if (busy) return M.ui.toast(M.t("tutor.waitFirst"));
          current = chats().find((c) => c.id === el.dataset.open) || current;
          M.app.rerender();
        };
        el.addEventListener("click", open);
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") open(e);
        });
      });
      $$("[data-del]", root).forEach((b) =>
        b.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (busy) return;
          if (!(await M.ui.confirm(M.t("tutor.deleteConfirm"), { danger: true, ok: M.t("common.delete") }))) return;
          const st = M.store.state;
          st.chats = st.chats.filter((c) => c.id !== b.dataset.del);
          if (current && current.id === b.dataset.del) current = st.chats[0] || newDraft(current);
          M.store.save();
          M.app.rerender();
        })
      );
    };

    const bindMsgs = () => {
      $$("[data-idea]", msgsEl).forEach((b) => b.addEventListener("click", () => send(b.dataset.idea)));
      $$("[data-copy]", msgsEl).forEach((b) =>
        b.addEventListener("click", async () => {
          const m = current.messages[Number(b.dataset.copy)];
          try {
            await navigator.clipboard.writeText(m.content);
            M.ui.toast(M.t("tutor.copied"), "good");
          } catch {
            M.ui.toast(M.t("tutor.copyFail"), "bad");
          }
        })
      );
      $$("[data-tocards]", msgsEl).forEach((b) =>
        b.addEventListener("click", async () => {
          const m = current.messages[Number(b.dataset.tocards)];
          if (!M.ai.hasKey()) {
            const cards = M.brain.extractCards(m.content);
            if (!cards.length) return M.ui.toast(M.t("notes.extractNone"), "bad");
            return M.views.cards.preview(cards, current.subjectId);
          }
          b.disabled = true;
          b.classList.add("loading");
          try {
            const cards = await M.ai.makeCards(m.content, 6);
            M.views.cards.preview(cards, current.subjectId);
          } catch (err) {
            M.ui.toast(M.ai.errorText(err), "bad", 5000);
          } finally {
            b.disabled = false;
            b.classList.remove("loading");
          }
        })
      );
      $$("[data-retry]", msgsEl).forEach((b) =>
        b.addEventListener("click", () => {
          if (busy) return;
          const last = current.messages[current.messages.length - 1];
          if (last && last.error) current.messages.pop();
          paint();
          respond();
        })
      );
    };

    bindList();
    bindMsgs();

    $("[data-new]", root).addEventListener("click", () => {
      if (busy) return M.ui.toast(M.t("tutor.waitFirst"));
      current = newDraft(current);
      M.app.rerender();
      setTimeout(() => $("#ask") && $("#ask").focus(), 30);
    });
    $$("[data-mode]", root).forEach((b) =>
      b.addEventListener("click", () => {
        current.mode = b.dataset.mode;
        $$("[data-mode]", root).forEach((x) => x.classList.toggle("on", x === b));
        if (!current.draft) persist(current);
        if (!current.messages.length) paint();
      })
    );
    $("[data-subject]", root).addEventListener("change", (e) => {
      current.subjectId = e.target.value;
      $("[data-notes]", root).disabled = !current.subjectId;
      if (!current.draft) persist(current);
    });
    $("[data-notes]", root).addEventListener("change", (e) => {
      current.useNotes = e.target.checked;
      if (!current.draft) persist(current);
    });
    const keyBtn = $("[data-key]", root);
    if (keyBtn) keyBtn.addEventListener("click", () => M.app.needKey());

    ta.addEventListener("input", () => autosize(ta, 200));
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send();
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });
    sendBtn.addEventListener("click", (e) => {
      if (busy) {
        e.preventDefault();
        if (controller) controller.abort();
      }
    });
    if (query.ask && !busy) {
      const q = query.ask;
      history.replaceState(null, "", "#/tutor");
      setTimeout(() => send(q), 0);
    } else {
      setTimeout(() => ta.focus(), 50);
    }
    setBusy(busy);
    return () => {
      if (controller) controller.abort();
    };
  };

  M.views.tutor = {
    render,
    get current() {
      return current;
    },
  };
})();
