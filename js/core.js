window.M = window.M || {};

(() => {
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dateKey(new Date());
  const ymd = (s) => {
    const [y, m, d] = String(s).split("-").map(Number);
    return [y, m - 1, d];
  };
  const parseDay = (s) => new Date(...ymd(s));
  const addDays = (s, n) => {
    const d = parseDay(s);
    d.setDate(d.getDate() + n);
    return dateKey(d);
  };
  const daysBetween = (a, b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86400000);
  const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(parseDay(s));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    tutor: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5z"/><path d="M12.5 7.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z"/>',
    notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h5"/>',
    cards: '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>',
    skip: '<path d="M6 5l10 7-10 7z"/><path d="M19 5v14"/>',
    send: '<path d="M4 12 20 4l-6 16-2.5-6.5z"/><path d="M11.5 13.5 20 4"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    flame: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-3.3 2.4-5.4 3.6-8.5.4 2 1.5 3 2.6 3.4C11 6.6 12.7 4.3 15 3c-.4 3 1 5 2.4 6.8 1 1.3 1.6 2.8 1.6 4.7 0 3.8-3 6.5-7 6.5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5z"/><path d="M5 18.5A1.5 1.5 0 0 0 6.5 20H19"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l3 3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sparkle: '<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>',
    flip: '<path d="M4 9a8 8 0 0 1 14-3.5L20 8"/><path d="M20 4v4h-4"/><path d="M20 15a8 8 0 0 1-14 3.5L4 16"/><path d="M4 20v-4h4"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    shapes: '<path d="M8.5 3 14 12.5H3z"/><circle cx="17" cy="16.5" r="4.5"/><rect x="3" y="15" width="7" height="6" rx="1"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
    ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    wand: '<path d="m4 20 11-11M14 6l1-3 1 3 3 1-3 1-1 3-1-3-3-1zM19 13l.5 1.5L21 15l-1.5.5L19 17l-.5-1.5L17 15l1.5-.5z"/>',
  };
  const icon = (name, size = 18) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const inline = (s) => {
    const codes = [];
    let out = esc(s).replace(/`([^`\n]+)`/g, (_, c) => {
      codes.push(c);
      return `%%MCODE${codes.length - 1}%%`;
    });
    out = out
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>")
      .replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
    return out.replace(/%%MCODE(\d+)%%/g, (_, n) => `<code>${codes[Number(n)]}</code>`);
  };

  const md = (src) => {
    const lines = String(src ?? "").replace(/\r\n?/g, "\n").split("\n");
    let html = "";
    let para = [];
    let list = null;
    const flushPara = () => {
      if (para.length) html += `<p>${inline(para.join("\n")).replace(/\n/g, "<br>")}</p>`;
      para = [];
    };
    const flushList = () => {
      if (list) html += `<${list.type}>${list.items.map((it) => `<li>${inline(it)}</li>`).join("")}</${list.type}>`;
      list = null;
    };
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*```/.test(line)) {
        flushPara();
        flushList();
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        html += `<pre><code>${esc(buf.join("\n"))}</code></pre>`;
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushPara();
        flushList();
        const lvl = Math.min(h[1].length + 2, 6);
        html += `<h${lvl}>${inline(h[2])}</h${lvl}>`;
        i++;
        continue;
      }
      if (/^\s*>\s?/.test(line)) {
        flushPara();
        flushList();
        const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
        html += `<blockquote>${inline(buf.join("\n")).replace(/\n/g, "<br>")}</blockquote>`;
        continue;
      }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        flushPara();
        flushList();
        html += "<hr>";
        i++;
        continue;
      }
      const ul = line.match(/^\s*[-*•]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        const type = ul ? "ul" : "ol";
        if (!list || list.type !== type) {
          flushList();
          list = { type, items: [] };
        }
        list.items.push((ul || ol)[1]);
        i++;
        continue;
      }
      if (!line.trim()) {
        flushPara();
        flushList();
        i++;
        continue;
      }
      if (list && /^\s{2,}\S/.test(line)) {
        list.items[list.items.length - 1] += " " + line.trim();
        i++;
        continue;
      }
      flushList();
      para.push(line);
      i++;
    }
    flushPara();
    flushList();
    return html;
  };

  const toast = (msg, kind = "info", ms = 3200) => {
    const root = $("#toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast toast-${kind}`;
    const ic = kind === "good" ? "check" : kind === "bad" ? "x" : "sparkle";
    el.innerHTML = `${icon(ic, 16)}<span>${esc(msg)}</span>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => {
      el.classList.remove("in");
      setTimeout(() => el.remove(), 300);
    }, ms);
  };

  const modal = ({ title, body = "", actions = [], wide = false, onOpen, onClose, dismissable = true }) => {
    const root = $("#modal-root");
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title || "")}">
      ${title ? `<div class="modal-head"><h2>${esc(title)}</h2>${dismissable ? `<button class="icon-btn" data-close aria-label="Close">${icon("x")}</button>` : ""}</div>` : ""}
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.kind || "ghost"}" data-act="${i}">${a.icon ? icon(a.icon, 16) : ""}<span>${esc(a.label)}</span></button>`).join("")}</div>` : ""}
    </div>`;
    const prevFocus = document.activeElement;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey, true);
      back.classList.remove("in");
      setTimeout(() => back.remove(), 180);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape" && dismissable) {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    back.addEventListener("mousedown", (e) => {
      if (e.target === back && dismissable) close();
    });
    back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    back.querySelectorAll("[data-act]").forEach((b) =>
      b.addEventListener("click", async () => {
        const a = actions[Number(b.dataset.act)];
        if (!a.onClick) return close();
        const res = await a.onClick(back, close);
        if (res !== false) close();
      })
    );
    root.appendChild(back);
    requestAnimationFrame(() => back.classList.add("in"));
    const first = back.querySelector("[autofocus], input, textarea, select") || back.querySelector(".modal-foot .btn:last-child");
    if (first) setTimeout(() => first.focus(), 30);
    if (onOpen) onOpen(back, close);
    return { el: back, close };
  };

  const confirmBox = (message, { ok, cancel, danger = false, title } = {}) =>
    new Promise((resolve) => {
      let answered = false;
      modal({
        title: title || "",
        body: `<p class="confirm-text">${esc(message)}</p>`,
        actions: [
          { label: cancel || M.t("common.cancel"), kind: "ghost", onClick: () => { answered = true; resolve(false); } },
          { label: ok || M.t("common.ok"), kind: danger ? "danger" : "primary", onClick: () => { answered = true; resolve(true); } },
        ],
        onClose: () => { if (!answered) resolve(false); },
      });
    });

  const fmtMinutes = (min) => {
    const m = Math.round(min);
    if (m < 60) return `${m} ${M.t("unit.min")}`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} ${M.t("unit.h")} ${r} ${M.t("unit.min")}` : `${h} ${M.t("unit.h")}`;
  };

  const locale = () => (M.store && M.store.state.settings.lang === "mk" ? "mk-MK" : "en-GB");
  const MK = {
    wl: ["недела", "понеделник", "вторник", "среда", "четврток", "петок", "сабота"],
    ws: ["нед", "пон", "вто", "сре", "чет", "пет", "саб"],
    ml: ["јануари", "февруари", "март", "април", "мај", "јуни", "јули", "август", "септември", "октомври", "ноември", "декември"],
    ms: ["јан", "фев", "мар", "апр", "мај", "јун", "јул", "авг", "сеп", "окт", "ное", "дек"],
  };
  const fmtMk = (d, opts) => {
    const wd = opts.weekday === "long" ? MK.wl[d.getDay()] : opts.weekday ? MK.ws[d.getDay()] : "";
    const mo = opts.month === "long" ? MK.ml[d.getMonth()] : opts.month ? MK.ms[d.getMonth()] : "";
    const dm = [opts.day ? String(d.getDate()) : "", mo].filter(Boolean).join(" ");
    return [wd, dm].filter(Boolean).join(", ");
  };
  const fmtDate = (s, opts = { day: "numeric", month: "short" }) => {
    if (locale() === "mk-MK") return fmtMk(parseDay(s), opts);
    try {
      return new Intl.DateTimeFormat(locale(), opts).format(parseDay(s));
    } catch {
      return s;
    }
  };
  const relDay = (s) => {
    const d = daysBetween(today(), s);
    if (d === 0) return M.t("day.today");
    if (d === 1) return M.t("day.tomorrow");
    if (d === -1) return M.t("day.yesterday");
    if (d > 1 && d < 7) return fmtDate(s, { weekday: "long" });
    return fmtDate(s, { day: "numeric", month: "short" });
  };

  const autosize = (ta, max = 220) => {
    ta.style.height = "auto";
    ta.style.height = Math.min(max, ta.scrollHeight) + "px";
  };

  const download = (filename, text, type = "application/json") => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  M.util = { esc, uid, pad, dateKey, today, parseDay, addDays, daysBetween, isDay, clamp, shuffle, debounce, $, $$, icon, md, inline, fmtMinutes, fmtDate, relDay, autosize, download, locale };
  M.ui = { toast, modal, confirm: confirmBox };
})();
