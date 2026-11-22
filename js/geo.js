(() => {
  const D = Math.PI / 180;
  const deg = (r) => r / D;
  const hyp = (x, y) => Math.sqrt(x * x + y * y);
  const DEPTH = 0.5;
  const TILT = 35 * D;
  const pr = (x, y, z) => [x + z * DEPTH * Math.cos(TILT), y + z * DEPTH * Math.sin(TILT)];
  const ELL = 0.32;

  const P = (k, sym, name, min, max, step, def, u = 1) => ({ k, sym, name, min, max, step, def, u });
  const R = (k, name, v, u, f, hl) => ({ k, name, v, u, f, hl });

  const SHAPES = [
    {
      id: "rect",
      dim: 2,
      params: [P("a", "a", "geo.p.width", 1, 30, 0.5, 8), P("b", "b", "geo.p.height", 1, 30, 0.5, 5)],
      calc: ({ a, b }, n) => ({
        ok: true,
        res: [
          R("area", "geo.r.area", a * b, 2, `a · b = ${n(a)} · ${n(b)}`, "face"),
          R("per", "geo.r.perimeter", 2 * (a + b), 1, `2 · (a + b) = 2 · (${n(a)} + ${n(b)})`, "edge"),
          R("d", "geo.r.diagonal", hyp(a, b), 1, `√(a² + b²) = √(${n(a)}² + ${n(b)}²)`, "diag"),
        ],
      }),
      box: ({ a, b }) => [[0, 0], [a, b]],
      draw: ({ a, b }, r, K) => {
        const c = [a / 2, b / 2];
        return (
          K.poly([[0, 0], [a, 0], [a, b], [0, b]], "g-face", "face edge") +
          K.line([0, 0], [a, b], "g-dash", "diag") +
          K.right([0, 0], [a, 0], [0, b]) +
          K.side([0, 0], [a, 0], c, K.v("a", a)) +
          K.side([a, 0], [a, b], c, K.v("b", b)) +
          K.side([a, b], [0, 0], [a, 0], K.v("d", r.d), 14) +
          K.handle("c", [a, b])
        );
      },
      drag: (h, x, y) => ({ a: x, b: y }),
    },
    {
      id: "rtri",
      dim: 2,
      params: [P("a", "a", "geo.p.legA", 1, 30, 0.5, 6), P("b", "b", "geo.p.legB", 1, 30, 0.5, 8)],
      calc: ({ a, b }, n) => {
        const c = hyp(a, b);
        const al = deg(Math.atan2(b, a));
        return {
          ok: true,
          res: [
            R("c", "geo.r.hyp", c, 1, `√(a² + b²) = √(${n(a)}² + ${n(b)}²)`, "hyp"),
            R("area", "geo.r.area", (a * b) / 2, 2, `a · b / 2 = ${n(a)} · ${n(b)} / 2`, "face"),
            R("per", "geo.r.perimeter", a + b + c, 1, `a + b + c = ${n(a)} + ${n(b)} + ${n(c)}`, "edge"),
            R("al", "geo.r.alpha", al, "deg", `tan α = b / a = ${n(b)} / ${n(a)}`, "angA"),
            R("be", "geo.r.beta", 90 - al, "deg", `90° − α = 90° − ${n(al)}°`, "angB"),
          ],
        };
      },
      box: ({ a, b }) => [[0, 0], [a, b]],
      draw: ({ a, b }, r, K) => {
        const O = [0, 0], B = [a, 0], A = [0, b], c = [a / 3, b / 3];
        return (
          K.poly([O, B, A], "g-face", "face edge") +
          K.line(B, A, "g-edge", "hyp edge") +
          K.right(O, B, A) +
          K.angle(B, O, A, "α", "angA") +
          K.angle(A, O, B, "β", "angB") +
          K.side(O, B, c, K.v("a", a)) +
          K.side(O, A, c, K.v("b", b)) +
          K.side(B, A, c, K.v("c", r.c)) +
          K.handle("a", B) +
          K.handle("b", A)
        );
      },
      drag: (h, x, y) => (h === "a" ? { a: x } : { b: y }),
    },
    {
      id: "tri",
      dim: 2,
      params: [P("a", "a", "geo.p.side", 1, 30, 0.5, 7), P("b", "b", "geo.p.side", 1, 30, 0.5, 6), P("c", "c", "geo.p.side", 1, 30, 0.5, 5)],
      calc: ({ a, b, c }, n, t) => {
        if (!(a + b > c && a + c > b && b + c > a)) return { ok: false, err: "geo.invalid" };
        const al = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
        const be = deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
        const ga = 180 - al - be;
        const s = (a + b + c) / 2;
        const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
        const big = Math.max(al, be, ga);
        const angType = Math.abs(big - 90) < 0.05 ? "geo.t.right" : big > 90 ? "geo.t.obtuse" : "geo.t.acute";
        const eq = (x, y) => Math.abs(x - y) < 1e-9;
        const sideType = eq(a, b) && eq(b, c) ? "geo.t.equilateral" : eq(a, b) || eq(b, c) || eq(a, c) ? "geo.t.isosceles" : "geo.t.scalene";
        return {
          ok: true,
          res: [
            R("type", "geo.r.type", `${t(angType).charAt(0).toUpperCase()}${t(angType).slice(1)}, ${t(sideType)}`, "text", "", "face"),
            R("per", "geo.r.perimeter", a + b + c, 1, `a + b + c = ${n(a)} + ${n(b)} + ${n(c)}`, "edge"),
            R("area", "geo.r.area", area, 2, `√(s(s − a)(s − b)(s − c)), s = ${n(s)}`, "face"),
            R("hc", "geo.r.heightC", (2 * area) / c, 1, `2 · ${n(area)} / c = 2 · ${n(area)} / ${n(c)}`, "h"),
            R("al", "geo.r.alpha", al, "deg", `cos α = (b² + c² − a²) / 2bc`, "angA"),
            R("be", "geo.r.beta", be, "deg", `cos β = (a² + c² − b²) / 2ac`, "angB"),
            R("ga", "geo.r.gamma", ga, "deg", `180° − α − β = 180° − ${n(al)}° − ${n(be)}°`, "angC"),
          ],
          al,
        };
      },
      box: ({ b, c }, r) => {
        const C = [b * Math.cos(r.al * D), b * Math.sin(r.al * D)];
        return [[0, 0], [c, 0], C, [C[0], 0]];
      },
      draw: ({ a, b, c }, r, K) => {
        const A = [0, 0], B = [c, 0], C = [b * Math.cos(r.al * D), b * Math.sin(r.al * D)];
        const g = [(A[0] + B[0] + C[0]) / 3, C[1] / 3];
        const foot = [C[0], 0];
        let out = "";
        if (foot[0] < 0) out += K.line(foot, A, "g-dash", "");
        if (foot[0] > c) out += K.line(B, foot, "g-dash", "");
        return (
          out +
          K.poly([A, B, C], "g-face", "face edge") +
          K.line(C, foot, "g-dash", "h") +
          K.right(foot, C, foot[0] > 0 ? A : B, 10) +
          K.angle(A, B, C, "α", "angA") +
          K.angle(B, C, A, "β", "angB") +
          K.angle(C, A, B, "γ", "angC") +
          K.side(B, C, g, K.v("a", a)) +
          K.side(A, C, g, K.v("b", b)) +
          K.side(A, B, g, K.v("c", c)) +
          K.handle("C", C)
        );
      },
      drag: (h, x, y, p) => {
        const yy = Math.max(0.3, y);
        return { b: hyp(x, yy), a: hyp(x - p.c, yy) };
      },
    },
    {
      id: "circle",
      dim: 2,
      params: [P("r", "r", "geo.p.radius", 0.5, 30, 0.5, 5), P("t", "θ", "geo.p.sector", 0, 360, 1, 90, "deg")],
      calc: ({ r, t }, n) => ({
        ok: true,
        res: [
          R("d", "geo.r.diameter", 2 * r, 1, `2 · r = 2 · ${n(r)}`, "diam"),
          R("circ", "geo.r.circ", 2 * Math.PI * r, 1, `2 · π · r = 2 · π · ${n(r)}`, "edge"),
          R("area", "geo.r.area", Math.PI * r * r, 2, `π · r² = π · ${n(r)}²`, "face"),
          R("arc", "geo.r.arc", (t / 360) * 2 * Math.PI * r, 1, `θ / 360° · 2πr = ${n(t)} / 360 · 2 · π · ${n(r)}`, "arc"),
          R("sector", "geo.r.sector", (t / 360) * Math.PI * r * r, 2, `θ / 360° · πr² = ${n(t)} / 360 · π · ${n(r)}²`, "sector"),
        ],
      }),
      box: ({ r }) => [[-r, -r], [r, r]],
      draw: ({ r, t }, res, K) => {
        const E = [r * Math.cos(t * D), r * Math.sin(t * D)];
        return (
          K.circle([0, 0], r, "g-face", "face edge") +
          K.sector([0, 0], r, t, "g-sector", "sector") +
          K.arc([0, 0], r, t, "g-arc", "arc") +
          K.line([-r, 0], [r, 0], "g-dash", "diam") +
          K.line([0, 0], E, "g-line", "") +
          K.dot([0, 0]) +
          (t > 0 && t <= 180 ? K.angle([0, 0], [r, 0], E, "θ", "sector", 24) : "") +
          (t > 180 && t < 360 ? K.text(K.P([0, 0])[0] + 34 * Math.cos((-t / 2) * D), K.P([0, 0])[1] + 34 * Math.sin((-t / 2) * D), "θ", "g-lbl g-small") : "") +
          K.side([0, 0], E, [r * Math.cos((t + 90) * D), r * Math.sin((t + 90) * D)], K.v("r", r), 14) +
          K.handle("p", E)
        );
      },
      drag: (h, x, y) => ({ r: hyp(x, y), t: (deg(Math.atan2(y, x)) + 360) % 360 }),
    },
    {
      id: "trap",
      dim: 2,
      params: [P("a", "a", "geo.p.bottom", 1, 30, 0.5, 10), P("b", "b", "geo.p.top", 0.5, 30, 0.5, 6), P("h", "h", "geo.p.height", 0.5, 30, 0.5, 5)],
      calc: ({ a, b, h }, n) => {
        const leg = hyp(h, (a - b) / 2);
        return {
          ok: true,
          res: [
            R("area", "geo.r.area", ((a + b) / 2) * h, 2, `(a + b) / 2 · h = (${n(a)} + ${n(b)}) / 2 · ${n(h)}`, "face"),
            R("m", "geo.r.midline", (a + b) / 2, 1, `(a + b) / 2 = (${n(a)} + ${n(b)}) / 2`, "mid"),
            R("leg", "geo.r.leg", leg, 1, `√(h² + ((a − b) / 2)²) = √(${n(h)}² + ${n(Math.abs(a - b) / 2)}²)`, "leg"),
            R("per", "geo.r.perimeter", a + b + 2 * leg, 1, `a + b + 2 · c = ${n(a)} + ${n(b)} + 2 · ${n(leg)}`, "edge"),
          ],
        };
      },
      box: ({ a, b, h }) => [[0, 0], [a, 0], [(a - b) / 2, h], [(a + b) / 2, h]],
      draw: ({ a, b, h }, r, K) => {
        const p1 = [0, 0], p2 = [a, 0], p3 = [(a + b) / 2, h], p4 = [(a - b) / 2, h];
        const g = [a / 2, h / 2];
        const foot = [p4[0], 0];
        let out = foot[0] < 0 ? K.line(foot, p1, "g-dash", "") : "";
        return (
          out +
          K.poly([p1, p2, p3, p4], "g-face", "face edge") +
          K.line(p2, p3, "g-edge", "leg") +
          K.line(p1, p4, "g-edge", "leg") +
          K.line(p4, foot, "g-dash", "h") +
          K.right(foot, p4, p2, 10) +
          K.line([(a - b) / 4, h / 2], [a - (a - b) / 4, h / 2], "g-dash", "mid") +
          K.side(p1, p2, g, K.v("a", a)) +
          K.side(p4, p3, g, K.v("b", b)) +
          K.side(p2, p3, g, K.v("c", r.leg)) +
          K.text(K.P([p4[0], h / 2])[0] + 8, K.P([p4[0], h / 2])[1], K.v("h", h), "g-lbl", "start") +
          K.handle("t", p3) +
          K.handle("a", p2)
        );
      },
      drag: (hd, x, y, p) => (hd === "a" ? { a: x } : { b: 2 * x - p.a, h: y }),
    },
    {
      id: "para",
      dim: 2,
      params: [P("a", "a", "geo.p.base", 1, 30, 0.5, 9), P("b", "b", "geo.p.side", 1, 30, 0.5, 5), P("al", "α", "geo.p.angle", 10, 170, 1, 60, "deg")],
      calc: ({ a, b, al }, n) => {
        const h = b * Math.sin(al * D);
        const cs = Math.cos(al * D);
        return {
          ok: true,
          res: [
            R("area", "geo.r.area", a * h, 2, `a · b · sin α = ${n(a)} · ${n(b)} · sin ${n(al)}°`, "face"),
            R("h", "geo.r.height", h, 1, `b · sin α = ${n(b)} · sin ${n(al)}°`, "h"),
            R("per", "geo.r.perimeter", 2 * (a + b), 1, `2 · (a + b) = 2 · (${n(a)} + ${n(b)})`, "edge"),
            R("d1", "geo.r.d1", Math.sqrt(Math.max(0, a * a + b * b + 2 * a * b * cs)), 1, `√(a² + b² + 2ab · cos α)`, "d1"),
            R("d2", "geo.r.d2", Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * cs)), 1, `√(a² + b² − 2ab · cos α)`, "d2"),
          ],
        };
      },
      box: ({ a, b, al }) => {
        const dx = b * Math.cos(al * D), dy = b * Math.sin(al * D);
        return [[0, 0], [a, 0], [a + dx, dy], [dx, dy], [dx, 0]];
      },
      draw: ({ a, b, al }, r, K) => {
        const dx = b * Math.cos(al * D), dy = b * Math.sin(al * D);
        const O = [0, 0], B = [a, 0], C = [a + dx, dy], Dd = [dx, dy];
        const g = [(a + dx) / 2, dy / 2];
        const foot = [dx, 0];
        let out = foot[0] < 0 ? K.line(foot, O, "g-dash", "") : "";
        return (
          out +
          K.poly([O, B, C, Dd], "g-face", "face edge") +
          K.line(O, C, "g-dash", "d1") +
          K.line(B, Dd, "g-dash", "d2") +
          K.line(Dd, foot, "g-dash", "h") +
          K.right(foot, Dd, foot[0] >= 0 ? B : O, 10) +
          K.angle(O, B, Dd, "α", "", 26) +
          K.side(O, B, g, K.v("a", a)) +
          K.side(O, Dd, g, K.v("b", b)) +
          K.text(K.P([dx, dy / 2])[0] + 8, K.P([dx, dy / 2])[1], K.v("h", r.h), "g-lbl", "start") +
          K.handle("v", Dd)
        );
      },
      drag: (h, x, y) => ({ b: hyp(x, Math.max(0.2, y)), al: deg(Math.atan2(Math.max(0.2, y), x)) }),
    },
    {
      id: "poly",
      dim: 2,
      params: [P("n", "n", "geo.p.sides", 3, 12, 1, 6, 0), P("a", "a", "geo.p.side", 0.5, 20, 0.5, 4)],
      calc: ({ n: k, a }, n) => {
        const R0 = a / (2 * Math.sin(Math.PI / k));
        const ap = a / (2 * Math.tan(Math.PI / k));
        return {
          ok: true,
          res: [
            R("per", "geo.r.perimeter", k * a, 1, `n · a = ${n(k)} · ${n(a)}`, "edge"),
            R("area", "geo.r.area", (k * a * ap) / 2, 2, `n · a · r / 2 = ${n(k)} · ${n(a)} · ${n(ap)} / 2`, "face"),
            R("ang", "geo.r.interior", ((k - 2) * 180) / k, "deg", `(n − 2) · 180° / n = (${n(k)} − 2) · 180° / ${n(k)}`, "ang"),
            R("ap", "geo.r.apothem", ap, 1, `r = a / (2 · tan(180° / n))`, "apo"),
            R("R", "geo.r.circumradius", R0, 1, `R = a / (2 · sin(180° / n))`, "R"),
          ],
          R0,
        };
      },
      box: (p, r) => [[-r.R0, -r.R0], [r.R0, r.R0]],
      draw: ({ n: k, a }, r, K) => {
        const off = -Math.PI / 2 - Math.PI / k;
        const V = Array.from({ length: k }, (_, i) => [r.R0 * Math.cos(off + (2 * Math.PI * i) / k), r.R0 * Math.sin(off + (2 * Math.PI * i) / k)]);
        const mid = [(V[0][0] + V[1][0]) / 2, (V[0][1] + V[1][1]) / 2];
        return (
          K.poly(V, "g-face", "face edge") +
          K.line([0, 0], mid, "g-dash", "apo") +
          K.line([0, 0], V[1], "g-dash", "R") +
          K.right(mid, [0, 0], V[1], 9) +
          K.angle(V[1], V[0], V[2], "", "ang", 22) +
          K.dot([0, 0]) +
          K.side(V[0], V[1], [0, 0], K.v("a", a)) +
          K.text(K.P(mid)[0] - 8, (K.P(mid)[1] + K.P([0, 0])[1]) / 2, "r", "g-lbl g-small", "end") +
          K.handle("v", V[1])
        );
      },
      drag: (h, x, y, p) => ({ a: 2 * hyp(x, y) * Math.sin(Math.PI / p.n) }),
    },
    {
      id: "cuboid",
      dim: 3,
      params: [P("a", "a", "geo.p.length", 1, 20, 0.5, 6), P("b", "b", "geo.p.width", 1, 20, 0.5, 4), P("c", "c", "geo.p.height", 1, 20, 0.5, 3)],
      calc: ({ a, b, c }, n) => ({
        ok: true,
        res: [
          R("V", "geo.r.volume", a * b * c, 3, `a · b · c = ${n(a)} · ${n(b)} · ${n(c)}`, "solid"),
          R("S", "geo.r.surface", 2 * (a * b + b * c + a * c), 2, `2 · (ab + bc + ac) = 2 · (${n(a * b)} + ${n(b * c)} + ${n(a * c)})`, "faces"),
          R("d", "geo.r.spaceDiag", Math.sqrt(a * a + b * b + c * c), 1, `√(a² + b² + c²) = √(${n(a)}² + ${n(b)}² + ${n(c)}²)`, "diag"),
        ],
      }),
      box: ({ a, b, c }) => [pr(0, 0, 0), pr(a, 0, 0), pr(a, c, b), pr(0, c, b), pr(a, 0, b), pr(0, c, 0)],
      draw: ({ a, b, c }, r, K) => {
        const p = (x, y, z) => pr(x, y, z);
        const g = p(a / 2, c / 2, b / 2);
        return (
          K.line(p(0, 0, b), p(a, 0, b), "g-dash", "") +
          K.line(p(0, 0, b), p(0, c, b), "g-dash", "") +
          K.line(p(0, 0, b), p(0, 0, 0), "g-dash", "") +
          K.poly([p(0, 0, 0), p(a, 0, 0), p(a, c, 0), p(0, c, 0)], "g-face", "solid faces") +
          K.poly([p(0, c, 0), p(a, c, 0), p(a, c, b), p(0, c, b)], "g-face g-top", "solid faces") +
          K.poly([p(a, 0, 0), p(a, 0, b), p(a, c, b), p(a, c, 0)], "g-face g-side", "solid faces") +
          K.line(p(0, 0, 0), p(a, c, b), "g-dash", "diag") +
          K.side(p(0, 0, 0), p(a, 0, 0), g, K.v("a", a)) +
          K.side(p(a, 0, 0), p(a, 0, b), g, K.v("b", b)) +
          K.side(p(0, 0, 0), p(0, c, 0), g, K.v("c", c))
        );
      },
    },
    {
      id: "cyl",
      dim: 3,
      params: [P("r", "r", "geo.p.radius", 0.5, 20, 0.5, 3), P("h", "h", "geo.p.height", 0.5, 30, 0.5, 7)],
      calc: ({ r, h }, n) => ({
        ok: true,
        res: [
          R("V", "geo.r.volume", Math.PI * r * r * h, 3, `π · r² · h = π · ${n(r)}² · ${n(h)}`, "solid"),
          R("L", "geo.r.lateral", 2 * Math.PI * r * h, 2, `2 · π · r · h = 2 · π · ${n(r)} · ${n(h)}`, "lat"),
          R("S", "geo.r.surface", 2 * Math.PI * r * (r + h), 2, `2 · π · r · (r + h) = 2 · π · ${n(r)} · (${n(r)} + ${n(h)})`, "faces"),
        ],
      }),
      box: ({ r, h }) => [[-r, -r * ELL], [r, h + r * ELL]],
      draw: ({ r, h }, res, K) => {
        const B = K.P([0, 0]), T = K.P([0, h]);
        const rx = r * K.s, ry = r * ELL * K.s;
        const body = `M ${B[0] - rx} ${T[1]} L ${B[0] - rx} ${B[1]} A ${rx} ${ry} 0 0 0 ${B[0] + rx} ${B[1]} L ${B[0] + rx} ${T[1]} A ${rx} ${ry} 0 0 1 ${B[0] - rx} ${T[1]} Z`;
        return (
          K.path(`M ${B[0] - rx} ${B[1]} A ${rx} ${ry} 0 0 1 ${B[0] + rx} ${B[1]}`, "g-dash", "") +
          K.path(body, "g-face", "solid lat faces") +
          K.ellipse([0, h], r, r * ELL, "g-face g-top", "faces") +
          K.line([0, 0], [0, h], "g-dash", "h") +
          K.line([0, h], [r, h], "g-line", "") +
          K.dot([0, h]) +
          K.text(K.P([r / 2, h])[0], K.P([r / 2, h])[1] - 12, K.v("r", r)) +
          K.text(K.P([0, h / 2])[0] + 8, K.P([0, h / 2])[1], K.v("h", h), "g-lbl", "start")
        );
      },
    },
    {
      id: "cone",
      dim: 3,
      params: [P("r", "r", "geo.p.radius", 0.5, 20, 0.5, 3), P("h", "h", "geo.p.height", 0.5, 30, 0.5, 6)],
      calc: ({ r, h }, n) => {
        const s = hyp(r, h);
        return {
          ok: true,
          res: [
            R("V", "geo.r.volume", (Math.PI * r * r * h) / 3, 3, `π · r² · h / 3 = π · ${n(r)}² · ${n(h)} / 3`, "solid"),
            R("s", "geo.r.slant", s, 1, `√(r² + h²) = √(${n(r)}² + ${n(h)}²)`, "s"),
            R("L", "geo.r.lateral", Math.PI * r * s, 2, `π · r · s = π · ${n(r)} · ${n(s)}`, "lat"),
            R("S", "geo.r.surface", Math.PI * r * (r + s), 2, `π · r · (r + s) = π · ${n(r)} · (${n(r)} + ${n(s)})`, "faces"),
          ],
        };
      },
      box: ({ r, h }) => [[-r, -r * ELL], [r, h]],
      draw: ({ r, h }, res, K) => {
        const B = K.P([0, 0]), A = K.P([0, h]);
        const rx = r * K.s, ry = r * ELL * K.s;
        const body = `M ${B[0] - rx} ${B[1]} L ${A[0]} ${A[1]} L ${B[0] + rx} ${B[1]} A ${rx} ${ry} 0 0 1 ${B[0] - rx} ${B[1]} Z`;
        return (
          K.path(`M ${B[0] - rx} ${B[1]} A ${rx} ${ry} 0 0 1 ${B[0] + rx} ${B[1]}`, "g-dash", "") +
          K.path(body, "g-face", "solid lat faces") +
          K.line([0, 0], [0, h], "g-dash", "h") +
          K.line([0, 0], [r, 0], "g-line", "") +
          K.line([r, 0], [0, h], "g-edge", "s") +
          K.right([0, 0], [0, h], [r, 0], 10) +
          K.dot([0, 0]) +
          K.text(K.P([r / 2, 0])[0], K.P([r / 2, 0])[1] + 14, K.v("r", r)) +
          K.text(K.P([0, h / 2])[0] - 8, K.P([0, h / 2])[1], K.v("h", h), "g-lbl", "end") +
          K.side([r, 0], [0, h], [0, 0], K.v("s", res.s))
        );
      },
    },
    {
      id: "sphere",
      dim: 3,
      params: [P("r", "r", "geo.p.radius", 0.5, 20, 0.5, 4)],
      calc: ({ r }, n) => ({
        ok: true,
        res: [
          R("V", "geo.r.volume", (4 / 3) * Math.PI * r * r * r, 3, `4 / 3 · π · r³ = 4 / 3 · π · ${n(r)}³`, "solid"),
          R("S", "geo.r.surface", 4 * Math.PI * r * r, 2, `4 · π · r² = 4 · π · ${n(r)}²`, "faces"),
          R("d", "geo.r.diameter", 2 * r, 1, `2 · r = 2 · ${n(r)}`, "diam"),
        ],
      }),
      box: ({ r }) => [[-r, -r], [r, r]],
      draw: ({ r }, res, K) => {
        const C = K.P([0, 0]);
        const rx = r * K.s, ry = r * ELL * K.s;
        return (
          K.circle([0, 0], r, "g-face", "solid faces") +
          K.path(`M ${C[0] - rx} ${C[1]} A ${rx} ${ry} 0 0 1 ${C[0] + rx} ${C[1]}`, "g-dash", "") +
          K.path(`M ${C[0] - rx} ${C[1]} A ${rx} ${ry} 0 0 0 ${C[0] + rx} ${C[1]}`, "g-line g-thin", "") +
          K.line([-r, 0], [0, 0], "g-dash", "diam") +
          K.line([0, 0], [r, 0], "g-line", "diam") +
          K.dot([0, 0]) +
          K.text(K.P([r / 2, 0])[0], K.P([r / 2, 0])[1] - 13, K.v("r", r))
        );
      },
    },
  ];

  const kit = (T, esc, v) => {
    const fx = (n) => (Math.round(n * 10) / 10).toString();
    const pt = (p) => [T.x(p[0]), T.y(p[1])];
    const part = (p) => (p ? ` data-part="${p}"` : "");
    const K = {
      s: T.s,
      P: pt,
      v,
      poly: (arr, cls, p) => `<polygon class="${cls}"${part(p)} points="${arr.map((q) => pt(q).map(fx).join(",")).join(" ")}"/>`,
      line: (a, b, cls, p) => {
        const A = pt(a), B = pt(b);
        return `<line class="${cls}"${part(p)} x1="${fx(A[0])}" y1="${fx(A[1])}" x2="${fx(B[0])}" y2="${fx(B[1])}"/>`;
      },
      path: (d, cls, p) => `<path class="${cls}"${part(p)} d="${d}"/>`,
      circle: (c, r, cls, p) => {
        const C = pt(c);
        return `<circle class="${cls}"${part(p)} cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(r * T.s)}"/>`;
      },
      ellipse: (c, rx, ry, cls, p) => {
        const C = pt(c);
        return `<ellipse class="${cls}"${part(p)} cx="${fx(C[0])}" cy="${fx(C[1])}" rx="${fx(rx * T.s)}" ry="${fx(ry * T.s)}"/>`;
      },
      dot: (c) => {
        const C = pt(c);
        return `<circle class="g-pt" cx="${fx(C[0])}" cy="${fx(C[1])}" r="3.5"/>`;
      },
      sector: (c, r, t, cls, p) => {
        if (t <= 0) return "";
        const C = pt(c), R0 = r * T.s;
        if (t >= 359.999) return `<circle class="${cls}"${part(p)} cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(R0)}"/>`;
        const E = [C[0] + R0 * Math.cos(-t * D), C[1] + R0 * Math.sin(-t * D)];
        return `<path class="${cls}"${part(p)} d="M ${fx(C[0])} ${fx(C[1])} L ${fx(C[0] + R0)} ${fx(C[1])} A ${fx(R0)} ${fx(R0)} 0 ${t > 180 ? 1 : 0} 0 ${fx(E[0])} ${fx(E[1])} Z"/>`;
      },
      arc: (c, r, t, cls, p) => {
        if (t <= 0) return "";
        const C = pt(c), R0 = r * T.s;
        if (t >= 359.999) return `<circle class="${cls}"${part(p)} cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(R0)}"/>`;
        const E = [C[0] + R0 * Math.cos(-t * D), C[1] + R0 * Math.sin(-t * D)];
        return `<path class="${cls}"${part(p)} d="M ${fx(C[0] + R0)} ${fx(C[1])} A ${fx(R0)} ${fx(R0)} 0 ${t > 180 ? 1 : 0} 0 ${fx(E[0])} ${fx(E[1])}"/>`;
      },
      text: (x, y, s, cls = "g-lbl", anchor = "middle") => `<text class="${cls}" x="${fx(x)}" y="${fx(y)}" text-anchor="${anchor}" dominant-baseline="central">${esc(s)}</text>`,
      side: (a, b, c, s, off = 18) => {
        const A = pt(a), B = pt(b), C = pt(c);
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        let nx = -(B[1] - A[1]), ny = B[0] - A[0];
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        if ((mx - C[0]) * nx + (my - C[1]) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const anchor = Math.abs(nx) < 0.35 ? "middle" : nx > 0 ? "start" : "end";
        return K.text(mx + nx * off, my + ny * off, s, "g-lbl", anchor);
      },
      angle: (vx, p1, p2, s, p, r = 28) => {
        const V = pt(vx), A = pt(p1), B = pt(p2);
        const a1 = Math.atan2(A[1] - V[1], A[0] - V[0]);
        let d = Math.atan2(B[1] - V[1], B[0] - V[0]) - a1;
        while (d <= -Math.PI) d += 2 * Math.PI;
        while (d > Math.PI) d -= 2 * Math.PI;
        if (Math.abs(d) < 0.01) return "";
        const a2 = a1 + d;
        const sx = V[0] + r * Math.cos(a1), sy = V[1] + r * Math.sin(a1);
        const ex = V[0] + r * Math.cos(a2), ey = V[1] + r * Math.sin(a2);
        const mid = a1 + d / 2;
        const lr = r + 13;
        return `<path class="g-ang"${part(p)} d="M ${fx(V[0])} ${fx(V[1])} L ${fx(sx)} ${fx(sy)} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${fx(ex)} ${fx(ey)} Z"/>` + (s ? K.text(V[0] + lr * Math.cos(mid), V[1] + lr * Math.sin(mid), s, "g-lbl g-small") : "");
      },
      right: (vx, p1, p2, z = 13) => {
        const V = pt(vx), A = pt(p1), B = pt(p2);
        const u = [A[0] - V[0], A[1] - V[1]], w = [B[0] - V[0], B[1] - V[1]];
        const lu = Math.hypot(...u) || 1, lw = Math.hypot(...w) || 1;
        const U = [(u[0] / lu) * z, (u[1] / lu) * z], Wv = [(w[0] / lw) * z, (w[1] / lw) * z];
        return `<path class="g-right" d="M ${fx(V[0] + U[0])} ${fx(V[1] + U[1])} L ${fx(V[0] + U[0] + Wv[0])} ${fx(V[1] + U[1] + Wv[1])} L ${fx(V[0] + Wv[0])} ${fx(V[1] + Wv[1])}"/>`;
      },
      handle: (id, p) => {
        const H = pt(p);
        return `<g class="handle" data-h="${id}" transform="translate(${fx(H[0])} ${fx(H[1])})"><circle class="h-halo" r="17"/><circle class="h-dot" r="8.5"/></g>`;
      },
    };
    return K;
  };

  const fit = (pts, W, H, padX, padY = padX) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6);
    const s = Math.min((W - 2 * padX) / w, (H - 2 * padY) / h);
    const ox = (W - w * s) / 2, oy = (H - h * s) / 2;
    return {
      s,
      x: (x) => ox + (x - x0) * s,
      y: (y) => oy + (y1 - y) * s,
      ix: (X) => x0 + (X - ox) / s,
      iy: (Y) => y1 - (Y - oy) / s,
    };
  };

  M.geo = { SHAPES, kit, fit, pr };
})();
