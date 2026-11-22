(() => {
  const { $, esc, icon, today } = M.util;
  const S = () => M.store.state.settings;
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let audio = null;
  const ctx = () => {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      return audio;
    } catch {
      return null;
    }
  };
  const tone = (c, freq, at, dur, vol, type = "sine", to) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, c.currentTime + at + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + at);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + at);
    o.stop(c.currentTime + at + dur + 0.05);
  };
  const SOUNDS = {
    pop: (c) => tone(c, 520, 0, 0.12, 0.09, "triangle", 880),
    correct: (c) => {
      tone(c, 784, 0, 0.16, 0.1, "triangle");
      tone(c, 1175, 0.08, 0.22, 0.09, "triangle");
    },
    wrong: (c) => tone(c, 240, 0, 0.22, 0.07, "sine", 170),
    win: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.09, 0.32, 0.09, "triangle")),
    level: (c) => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.07, 0.4, 0.08, "triangle")),
  };
  const sound = (kind) => {
    if (S().sounds === false || !SOUNDS[kind]) return;
    try {
      const c = ctx();
      if (c) SOUNDS[kind](c);
    } catch {}
  };

  let canvas = null;
  let g2 = null;
  let parts = [];
  let raf = 0;
  const palette = () => {
    const cs = getComputedStyle(document.documentElement);
    return ["--accent", "--accent-2", "--hl", "--hl-strong", "--accent-deep"].map((v) => cs.getPropertyValue(v).trim() || "#8cc8ee").concat(["#ffffff"]);
  };
  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const frame = () => {
    g2.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life < p.max && p.y < innerHeight + 40);
    for (const p of parts) {
      p.life++;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const fade = Math.min(1, (p.max - p.life) / 25);
      g2.save();
      g2.globalAlpha = fade;
      g2.translate(p.x, p.y);
      g2.rotate(p.rot);
      g2.fillStyle = p.color;
      if (p.round) {
        g2.beginPath();
        g2.arc(0, 0, p.w / 2.4, 0, Math.PI * 2);
        g2.fill();
      } else g2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 6)) + 1);
      g2.restore();
    }
    if (parts.length) raf = requestAnimationFrame(frame);
    else {
      raf = 0;
      canvas.remove();
      canvas = null;
    }
  };
  const confetti = (opts = {}) => {
    if (calm()) return;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "confetti";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
      g2 = canvas.getContext("2d");
      size();
    }
    const colors = palette();
    const count = opts.count || 90;
    const x = opts.x ?? innerWidth / 2;
    const y = opts.y ?? innerHeight * 0.35;
    const spread = opts.spread || 1;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9 * spread;
      const v = 7 + Math.random() * 9;
      parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 2,
        g: 0.28 + Math.random() * 0.1,
        w: 7 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.35,
        color: colors[(Math.random() * colors.length) | 0],
        round: Math.random() < 0.3,
        life: 0,
        max: 110 + Math.random() * 60,
      });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const burstAt = (el, count = 40) => {
    if (!el) return confetti({ count });
    const r = el.getBoundingClientRect();
    confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count, spread: 1.6 });
  };

  const float = (text, anchor, kind = "xp") => {
    const el = document.createElement("div");
    el.className = `xp-float ${kind}`;
    el.textContent = text;
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    const src = anchor && anchor.getBoundingClientRect ? anchor : $(".xp-widget") || $(".level-chip");
    if (src && src.getBoundingClientRect) {
      const r = src.getBoundingClientRect();
      if (r.width || r.height) {
        x = r.left + r.width / 2;
        y = r.top;
      }
    }
    el.style.left = `${Math.max(40, Math.min(innerWidth - 40, x))}px`;
    el.style.top = `${Math.max(30, y)}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  };

  const RANKS = 8;
  const need = (level) => 100 + (level - 1) * 50;
  const info = (xp = M.store.state.xp || 0) => {
    let level = 1;
    let left = Math.max(0, Math.floor(xp));
    while (left >= need(level)) {
      left -= need(level);
      level++;
    }
    const rank = Math.min(RANKS - 1, Math.floor((level - 1) / 2));
    return { level, into: left, need: need(level), pct: left / need(level), rank, rankName: M.t(`xp.rank${rank}`), total: Math.floor(xp) };
  };

  const ringSvg = (pct, sz = 40) => {
    const r = sz / 2 - 4;
    const c = 2 * Math.PI * r;
    return `<svg class="xp-ring" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}" aria-hidden="true"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" class="xr-bg"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" class="xr-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 ${sz / 2} ${sz / 2})"/></svg>`;
  };

  const widget = () => {
    const x = info();
    return `<a class="xp-widget" href="#/home" title="${esc(M.t("xp.title"))}">
      <span class="xw-lvl"><b data-xlvl>${x.level}</b></span>
      <span class="xw-main">
        <span class="xw-top"><b data-xrank>${esc(x.rankName)}</b><small data-xnum>${x.into} / ${x.need} XP</small></span>
        <span class="xw-bar"><span data-xbar style="width:${Math.round(x.pct * 100)}%"></span></span>
      </span>
    </a>`;
  };

  const chip = () => {
    const x = info();
    return `<a class="level-chip" href="#/home" title="${esc(M.t("xp.title"))}">${ringSvg(x.pct, 38)}<span class="lc-num">${x.level}</span><span class="lc-text"><b>${esc(M.t("xp.level", { n: x.level }))} · ${esc(x.rankName)}</b><small>${esc(M.t("xp.toNext", { n: x.need - x.into }))}</small></span></a>`;
  };

  const paint = (bump) => {
    const x = info();
    const w = $(".xp-widget");
    if (w) {
      $("[data-xlvl]", w).textContent = x.level;
      $("[data-xrank]", w).textContent = x.rankName;
      $("[data-xnum]", w).textContent = `${x.into} / ${x.need} XP`;
      $("[data-xbar]", w).style.width = `${Math.round(x.pct * 100)}%`;
      if (bump) {
        w.classList.remove("bump");
        void w.offsetWidth;
        w.classList.add("bump");
      }
    }
    const c = $(".level-chip");
    if (c) c.outerHTML = chip();
  };

  const award = (amount, anchor, opts = {}) => {
    amount = Math.round(amount);
    if (!(amount > 0)) return;
    const st = M.store.state;
    const before = info(st.xp || 0).level;
    st.xp = (st.xp || 0) + amount;
    const day = today();
    const a = (st.activity[day] = st.activity[day] || {});
    a.xp = (a.xp || 0) + amount;
    M.store.save();
    float(opts.label ? `${opts.label} +${amount} XP` : `+${amount} XP`, anchor, opts.kind || "xp");
    paint(true);
    const after = info(st.xp).level;
    if (after > before) setTimeout(() => levelUp(after), 450);
  };

  const levelUp = (level) => {
    sound("level");
    confetti({ count: 170, y: innerHeight * 0.3 });
    const x = info();
    M.ui.toast(M.t("xp.levelUp", { n: level, rank: x.rankName }), "good", 5200);
  };

  const celebrate = (opts = {}) => {
    sound(opts.sound || "win");
    confetti({ count: opts.count || 120 });
  };

  const goalCheck = () => {
    const st = M.store.state;
    const day = today();
    const a = st.activity[day] || {};
    const goal = S().dailyGoal || 45;
    if ((a.minutes || 0) >= goal && !a.goal) {
      a.goal = 1;
      M.store.save();
      setTimeout(() => {
        celebrate({ count: 150 });
        M.ui.toast(M.t("xp.goalHit", { n: goal }), "good", 5200);
        award(30, null, { label: M.t("xp.goalBonus") });
      }, 700);
    }
  };

  M.fx = { sound, confetti, burstAt, float, celebrate, calm };
  M.xp = { info, need, award, paint, widget, chip, goalCheck, ringSvg };
})();
