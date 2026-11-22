(() => {
  const { $, $$, icon, esc, clamp } = M.util;
  const W = 560, H = 400, PX = 92, PY = 46;
  const UNITS = ["cm", "m", "mm"];

  const GLYPH = {
    rect: '<rect x="3" y="6" width="18" height="12" rx="1"/>',
    rtri: '<path d="M4 20V5l16 15z"/><path d="M4 16h4v4"/>',
    tri: '<path d="M3 19 9 5l12 14z"/>',
    circle: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12h8.5"/>',
    trap: '<path d="M3 18 7 6h10l4 12z"/>',
    para: '<path d="M2 18 7 6h15l-5 12z"/>',
    poly: '<path d="m12 3 8 5.5v7L12 21l-8-5.5v-7z"/>',
    cuboid: '<path d="M3 9h12v11H3zM3 9l5-5h12l-5 5M15 20l5-5V4"/>',
    cyl: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/>',
    cone: '<path d="M12 3 5 18c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5z"/>',
    sphere: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="8.5" ry="3"/>',
  };
  const glyph = (id) => `<svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${GLYPH[id] || ""}</svg>`;

  let shapeId = "rect";
  let unit = "cm";
  const values = {};
  const explored = new Set();

  const num = (v, d = 2) => {
    if (typeof v !== "number" || !isFinite(v)) return "–";
    const f = 10 ** d;
    let s = String(Math.round(v * f) / f);
    if (s === "-0") s = "0";
    return M.store.state.settings.lang === "mk" ? s.replace(".", ",") : s;
  };
  const unitText = (u) => (u === "deg" ? "°" : u === 2 ? ` ${unit}²` : u === 3 ? ` ${unit}³` : u === 1 ? ` ${unit}` : "");
  const label = (sym, v, u = 1) => `${sym} = ${num(v)}${u === "deg" ? "°" : u ? ` ${unit}` : ""}`;

  const shapeOf = (id) => M.geo.SHAPES.find((s) => s.id === id) || M.geo.SHAPES[0];
  const paramsOf = (shape) => {
    if (!values[shape.id]) values[shape.id] = Object.fromEntries(shape.params.map((p) => [p.k, p.def]));
    return values[shape.id];
  };

  const gridSvg = (T) => {
    const steps = [0.5, 1, 2, 5, 10, 20, 50];
    const step = steps.find((st) => st * T.s >= 18) || 50;
    const x0 = Math.floor(T.ix(0) / step) * step, x1 = T.ix(W);
    const y0 = Math.floor(T.iy(H) / step) * step, y1 = T.iy(0);
    let out = "";
    for (let x = x0; x <= x1; x += step) out += `<line x1="${T.x(x).toFixed(1)}" y1="0" x2="${T.x(x).toFixed(1)}" y2="${H}"/>`;
    for (let y = y0; y <= y1; y += step) out += `<line x1="0" y1="${T.y(y).toFixed(1)}" x2="${W}" y2="${T.y(y).toFixed(1)}"/>`;
    return { svg: `<g class="g-grid">${out}</g>`, step };
  };

  const render = (root, query) => {
    if (query.shape && M.geo.SHAPES.some((s) => s.id === query.shape)) shapeId = query.shape;
    let shape = shapeOf(shapeId);
    let T = null;
    let dragging = null;

    const pick = (dim) =>
      M.geo.SHAPES.filter((s) => s.dim === dim)
        .map((s) => `<button class="geo-shape${s.id === shapeId ? " on" : ""}" data-shape="${s.id}" aria-pressed="${s.id === shapeId}">${glyph(s.id)}<span>${esc(M.t(`geo.s.${s.id}`))}</span></button>`)
        .join("");

    root.innerHTML = `
      <header class="page-head rise">
        <div>
          <p class="eyebrow">${icon("ruler", 14)} ${esc(M.t("geo.eyebrow"))}</p>
          <h1>${esc(M.t("geo.title"))}</h1>
        </div>
        <div class="head-actions">
          <label class="field inline"><span>${esc(M.t("geo.unit"))}</span><select class="input sm" data-unit>${UNITS.map((u) => `<option value="${u}"${u === unit ? " selected" : ""}>${u}</option>`).join("")}</select></label>
        </div>
      </header>
      <section class="card geo-picker rise" style="--i:1">
        <div class="geo-group"><p class="eyebrow">${esc(M.t("geo.flat"))}</p><div class="geo-shapes">${pick(2)}</div></div>
        <div class="geo-group"><p class="eyebrow">${esc(M.t("geo.solid"))}</p><div class="geo-shapes">${pick(3)}</div></div>
      </section>
      <section class="geo-layout">
        <article class="card geo-stage rise" style="--i:2">
          <div class="geo-stage-head">
            <h3 data-gname></h3>
            <span class="geo-hint" data-ghint></span>
          </div>
          <svg class="geo-svg" viewBox="0 0 ${W} ${H}" data-svg role="img"></svg>
          <p class="geo-scale muted small" data-gscale></p>
        </article>
        <div class="geo-side">
          <article class="card rise" style="--i:3">
            <div class="card-head"><h3>${icon("edit", 16)} ${esc(M.t("geo.inputs"))}</h3></div>
            <div class="geo-inputs" data-inputs></div>
          </article>
          <article class="card rise" style="--i:4">
            <div class="card-head"><h3>${icon("sparkle", 16)} ${esc(M.t("geo.results"))}</h3><a class="btn ghost sm" data-ask>${icon("tutor", 15)}<span>${esc(M.t("geo.ask"))}</span></a></div>
            <div data-results></div>
          </article>
        </div>
      </section>`;

    const svg = $("[data-svg]", root);

    const inputsHtml = () => {
      const p = paramsOf(shape);
      return shape.params
        .map(
          (q) => `<div class="geo-in">
            <label for="gi-${q.k}"><span class="sym">${esc(q.sym)}</span>${esc(M.t(q.name))}</label>
            <div class="geo-in-row">
              <input type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${p[q.k]}" data-range="${q.k}" aria-label="${esc(M.t(q.name))}">
              <span class="geo-num"><input class="input sm mono" id="gi-${q.k}" type="text" inputmode="decimal" value="${num(p[q.k])}" data-num="${q.k}"><small>${esc(q.u === "deg" ? "°" : q.u ? unit : "")}</small></span>
            </div>
          </div>`
        )
        .join("");
    };

    const resultsHtml = (out) => {
      if (!out.ok) return `<p class="geo-err">${icon("x", 16)}<span>${esc(M.t(out.err))}</span></p>`;
      return `<ul class="geo-res">${out.res
        .map(
          (r) => `<li tabindex="0" data-hl="${r.hl || ""}">
            <div class="gr-top"><span class="gr-name">${esc(M.t(r.name))}</span><b class="gr-val">${esc(r.u === "text" ? r.v : num(r.v) + unitText(r.u))}</b></div>
            ${r.f ? `<code class="gr-f">${esc(r.f)}</code>` : ""}
          </li>`
        )
        .join("")}</ul>`;
    };

    const fits = (Tt, box) => {
      const xs = box.map(([x]) => Tt.x(x)), ys = box.map(([, y]) => Tt.y(y));
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      if (minX < PX * 0.6 || maxX > W - PX * 0.6 || minY < PY * 0.5 || maxY > H - PY * 0.5) return false;
      return maxX - minX > (W - 2 * PX) * 0.42 || maxY - minY > (H - 2 * PY) * 0.42;
    };

    const draw = () => {
      const p = paramsOf(shape);
      const out = shape.calc(p, num, M.t);

      $("[data-results]", root).innerHTML = resultsHtml(out);
      bindResults();
      if (!out.ok) {
        svg.innerHTML = `<text class="g-msg" x="${W / 2}" y="${H / 2}" text-anchor="middle">${esc(M.t("geo.noShape"))}</text>`;
        $("[data-gscale]", root).textContent = "";
        return;
      }
      const rm = { ...out, ...Object.fromEntries(out.res.map((r) => [r.k, r.v])) };
      const box = shape.box(p, rm);
      if (!T || (!dragging && !fits(T, box))) T = M.geo.fit(box, W, H, PX, PY);
      const K = M.geo.kit(T, esc, label);
      const grid = shape.dim === 2 ? gridSvg(T) : null;
      svg.innerHTML = (grid ? grid.svg : "") + shape.draw(p, rm, K);
      svg.setAttribute("aria-label", M.t(`geo.s.${shape.id}`));
      $("[data-gscale]", root).textContent = grid ? M.t("geo.grid", { n: num(grid.step), u: unit }) : "";
      bindHandles();
    };

    const syncInputs = (except) => {
      const p = paramsOf(shape);
      $$("[data-range]", root).forEach((el) => {
        if (el !== except) el.value = p[el.dataset.range];
      });
      $$("[data-num]", root).forEach((el) => {
        if (el !== except) el.value = num(p[el.dataset.num]);
      });
    };

    const setParam = (k, v) => {
      const q = shape.params.find((x) => x.k === k);
      if (!q || !isFinite(v)) return;
      const snapped = clamp(Math.round(v / q.step) * q.step, q.min, q.max);
      paramsOf(shape)[k] = Number(snapped.toFixed(4));
    };

    const touched = () => {
      if (explored.has(shape.id)) return;
      explored.add(shape.id);
      M.fx.sound("pop");
      M.xp.award(5, svg);
    };

    const bindInputs = () => {
      $("[data-inputs]", root).innerHTML = inputsHtml();
      $$("[data-range]", root).forEach((el) =>
        el.addEventListener("input", () => {
          setParam(el.dataset.range, Number(el.value));
          syncInputs(el);
          draw();
          touched();
        })
      );
      $$("[data-num]", root).forEach((el) => {
        el.addEventListener("input", () => {
          const v = Number(el.value.replace(",", "."));
          const q = shape.params.find((x) => x.k === el.dataset.num);
          if (el.value.trim() === "" || !isFinite(v) || v < q.min || v > q.max) return;
          paramsOf(shape)[q.k] = v;
          syncInputs(el);
          draw();
          touched();
        });
        el.addEventListener("change", () => {
          const v = Number(el.value.replace(",", "."));
          if (isFinite(v) && el.value.trim() !== "") setParam(el.dataset.num, v);
          syncInputs();
          draw();
        });
      });
    };

    const lit = (hl, on) => {
      if (!hl) return;
      hl.split(" ").forEach((h) => $$(`[data-part~="${h}"]`, svg).forEach((el) => el.classList.toggle("lit", on)));
    };
    const bindResults = () => {
      $$(".geo-res li", root).forEach((li) => {
        const hl = li.dataset.hl;
        li.addEventListener("mouseenter", () => lit(hl, true));
        li.addEventListener("mouseleave", () => !li.classList.contains("pinned") && lit(hl, false));
        li.addEventListener("focus", () => lit(hl, true));
        li.addEventListener("blur", () => !li.classList.contains("pinned") && lit(hl, false));
        li.addEventListener("click", () => {
          const on = !li.classList.contains("pinned");
          $$(".geo-res li.pinned", root).forEach((o) => {
            o.classList.remove("pinned");
            lit(o.dataset.hl, false);
          });
          li.classList.toggle("pinned", on);
          lit(hl, on);
        });
      });
    };

    const toModel = (e) => {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return [T.ix(pt.x), T.iy(pt.y)];
    };
    const bindHandles = () => {
      $$(".handle", svg).forEach((h) => {
        h.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          dragging = h.dataset.h;
          svg.classList.add("dragging");
          try {
            svg.setPointerCapture(e.pointerId);
          } catch {}
        });
      });
    };
    svg.addEventListener("pointermove", (e) => {
      if (!dragging || !shape.drag) return;
      const m = toModel(e);
      if (!m) return;
      const next = shape.drag(dragging, m[0], m[1], paramsOf(shape));
      Object.entries(next).forEach(([k, v]) => setParam(k, v));
      syncInputs();
      draw();
      touched();
    });
    const stop = () => {
      if (!dragging) return;
      dragging = null;
      svg.classList.remove("dragging");
      draw();
    };
    svg.addEventListener("pointerup", stop);
    svg.addEventListener("pointercancel", stop);

    const head = () => {
      $("[data-gname]", root).innerHTML = `${glyph(shape.id)} ${esc(M.t(`geo.s.${shape.id}`))}`;
      $("[data-ghint]", root).innerHTML = shape.drag ? `<span class="hint-dot"></span>${esc(M.t("geo.drag"))}` : esc(M.t("geo.dragSolid"));
      $("[data-ask]", root).setAttribute("href", `#/tutor?ask=${encodeURIComponent(M.t("geo.askText", { shape: M.t(`geo.s.${shape.id}`) }))}`);
    };

    const select = (id) => {
      shapeId = id;
      shape = shapeOf(id);
      T = null;
      $$("[data-shape]", root).forEach((b) => {
        const on = b.dataset.shape === id;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
        const row = b.parentElement;
        if (on && row.scrollWidth > row.clientWidth) {
          const br = b.getBoundingClientRect(), rr = row.getBoundingClientRect();
          row.scrollLeft += br.left - rr.left - (rr.width - br.width) / 2;
        }
      });
      head();
      bindInputs();
      draw();
    };

    $$("[data-shape]", root).forEach((b) => b.addEventListener("click", () => select(b.dataset.shape)));
    $("[data-unit]", root).addEventListener("change", (e) => {
      unit = e.target.value;
      bindInputs();
      draw();
    });

    select(shapeId);
  };

  M.views.geometry = { render };
})();
