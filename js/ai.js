(() => {
  const MODELS = [
    { id: "claude-opus-5-5", name: "Claude Opus 5.5", tier: "best" },
    { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", tier: "balanced" },
    { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", tier: "fast" },
  ];
  const FALLBACK_BETA = "server-side-fallback-2026-07-01";

  class AIError extends Error {
    constructor(code, detail) {
      super(detail || code);
      this.code = code;
    }
  }

  const settings = () => M.store.state.settings;
  const hasKey = () => !!(settings().apiKey || "").trim();
  const model = () => (MODELS.some((m) => m.id === settings().model) ? settings().model : MODELS[0].id);
  const language = () => (settings().lang === "mk" ? "Macedonian (Cyrillic script)" : "English");

  const client = () => {
    const key = (settings().apiKey || "").trim();
    if (!key) throw new AIError("nokey");
    if (!window.Anthropic) throw new AIError("sdk");
    return new window.Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 2 });
  };

  const base = (m) => {
    const p = { model: m };
    if (m !== "claude-haiku-5-5") {
      p.betas = [FALLBACK_BETA];
      p.fallbacks = "default";
    }
    return p;
  };

  const classify = (err) => {
    if (err instanceof AIError) return err;
    const A = window.Anthropic;
    if (A) {
      if (err instanceof A.APIUserAbortError) return new AIError("aborted");
      if (err instanceof A.AuthenticationError) return new AIError("auth");
      if (err instanceof A.PermissionDeniedError) return new AIError("permission");
      if (err instanceof A.NotFoundError) return new AIError("model");
      if (err instanceof A.RateLimitError) return new AIError("rate");
      if (err instanceof A.BadRequestError) return new AIError("bad", err.message);
      if (err instanceof A.APIConnectionError) return new AIError("network");
      if (err instanceof A.APIError) {
        if (err.status === 529 || (err.status && err.status >= 500)) return new AIError("busy");
        if (err.status === 402) return new AIError("billing");
        return new AIError("bad", err.message);
      }
    }
    if (err && err.name === "AbortError") return new AIError("aborted");
    return new AIError("unknown", err && err.message);
  };

  const errorText = (err) => {
    const e = classify(err);
    const key = `ai.err.${e.code}`;
    const text = M.t(key);
    return e.code === "bad" && e.message && e.message !== "bad" ? `${text} (${e.message.slice(0, 160)})` : text;
  };

  const textOf = (msg) => {
    const blocks = msg.content || [];
    let start = 0;
    blocks.forEach((b, i) => {
      if (b.type === "fallback") start = i + 1;
    });
    const after = blocks.slice(start).filter((b) => b.type === "text");
    const use = after.length ? after : blocks.filter((b) => b.type === "text");
    return use.map((b) => b.text).join("");
  };

  const baseSystem = () => {
    const name = (settings().name || "").trim();
    return [
      `You are Mentora, a warm and precise personal learning assistant for a high-school student${name ? ` named ${name}` : ""}.`,
      "Teach accurately and clearly. Prefer short paragraphs, numbered steps and bullet lists, and use a concrete example whenever it helps.",
      "Format with Markdown (headings, **bold**, lists, `code` and fenced code blocks). Do not use LaTeX; write math in plain text with Unicode symbols such as x², √, ≤, π.",
      "If you are not sure about a fact, say so instead of guessing. Keep the student thinking: when it fits, end with one short question that checks understanding.",
      `Always reply in ${language()}, even if the notes are in another language.`,
    ].join("\n");
  };

  const MODE_PROMPTS = {
    explain: "Mode: Explain. Explain the topic step by step, starting from what the student probably already knows, with one worked example.",
    socratic: "Mode: Socratic coach. Do not give the final answer straight away. Ask one guiding question at a time, build on the student's replies, give a hint when they are stuck, and confirm clearly when they get there.",
    quiz: "Mode: Quiz me. Ask exactly one question at a time about the topic the student gives. After each answer, say whether it is right, explain briefly why, keep a running score like (Score: 2/3), and then ask the next question.",
    simple: "Mode: Make it simple. Explain as if to a curious 10-year-old: everyday words, one vivid analogy, no jargon, under 150 words.",
  };

  const tutorSystem = (mode, subjectId, useNotes) => {
    let sys = baseSystem() + "\n\n" + (MODE_PROMPTS[mode] || MODE_PROMPTS.explain);
    if (subjectId) {
      sys += `\n\nThe current subject is ${M.store.subjectName(subjectId)}.`;
      if (useNotes) {
        const notes = M.store.state.notes.filter((n) => n.subjectId === subjectId && n.body);
        if (notes.length) {
          sys += "\n\nHere are the student's own notes for this subject. Build on their wording, and point out politely if something in the notes looks wrong.\n<notes>\n";
          sys += notes.map((n) => `<note title="${n.title.replace(/"/g, "'")}">\n${n.body}\n</note>`).join("\n");
          sys += "\n</notes>";
        }
      }
    }
    return sys;
  };

  const chat = async ({ system, messages, onText, signal }) => {
    const c = client();
    const m = model();
    let stream;
    try {
      stream = c.beta.messages.stream(
        {
          ...base(m),
          max_tokens: 32000,
          system,
          messages,
          cache_control: { type: "ephemeral" },
          output_config: { effort: "medium" },
        },
        { signal }
      );
      stream.on("text", (delta) => onText && onText(delta));
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") throw new AIError("refusal");
      return { text: textOf(msg), content: msg.content, model: msg.model, stop: msg.stop_reason };
    } catch (err) {
      throw classify(err);
    }
  };

  const generate = async ({ system, prompt, schema, effort = "medium", maxTokens = 16000 }) => {
    const c = client();
    const m = model();
    try {
      const params = {
        ...base(m),
        max_tokens: maxTokens,
        system: system || baseSystem(),
        messages: [{ role: "user", content: prompt }],
        output_config: schema ? { effort, format: { type: "json_schema", schema } } : { effort },
      };
      const msg = await c.beta.messages.create(params);
      if (msg.stop_reason === "refusal") throw new AIError("refusal");
      if (msg.stop_reason === "max_tokens") throw new AIError("long");
      const text = textOf(msg);
      if (!schema) return text;
      try {
        return JSON.parse(text);
      } catch {
        throw new AIError("format");
      }
    } catch (err) {
      throw classify(err);
    }
  };

  const obj = (props, required = Object.keys(props)) => ({ type: "object", properties: props, required, additionalProperties: false });
  const str = { type: "string" };

  const SCHEMAS = {
    cards: obj({ cards: { type: "array", items: obj({ front: str, back: str }) } }),
    quiz: obj({
      questions: {
        type: "array",
        items: obj({ question: str, options: { type: "array", items: str }, answer_index: { type: "integer" }, explanation: str }),
      },
    }),
    plan: obj({ sessions: { type: "array", items: obj({ date: str, title: str, minutes: { type: "integer" } }) } }),
  };

  const cleanCards = (data, max) =>
    (data && Array.isArray(data.cards) ? data.cards : [])
      .filter((c) => c && typeof c.front === "string" && typeof c.back === "string" && c.front.trim() && c.back.trim())
      .map((c) => ({ front: c.front.trim(), back: c.back.trim() }))
      .slice(0, max);

  const makeCards = async (source, count = 10) => {
    const data = await generate({
      prompt: `Create ${count} flashcards from the study material below.\nFront: a clear question or term. Back: a short, precise answer (at most 25 words).\nCover the most important ideas, avoid duplicates, and write the cards in ${language()}.\n\n<material>\n${source}\n</material>`,
      schema: SCHEMAS.cards,
    });
    const cards = cleanCards(data, count);
    if (!cards.length) throw new AIError("format");
    return cards;
  };

  const makeQuiz = async ({ topic, material, count = 8, level = "medium" }) => {
    const levels = { easy: "easy (basic recall)", medium: "medium (understanding and simple application)", hard: "hard (application, analysis and tricky distractors)" };
    const data = await generate({
      prompt:
        `Write a multiple-choice quiz with ${count} questions${topic ? ` about: ${topic}` : ""}.\n` +
        `Difficulty: ${levels[level] || levels.medium}.\n` +
        "Each question has exactly 4 options and exactly one correct option. answer_index is the 0-based index of the correct option. " +
        "Wrong options must be plausible. The explanation says in one or two sentences why the answer is correct.\n" +
        `Write everything in ${language()}.` +
        (material ? `\n\nBase the questions on this material:\n<material>\n${material}\n</material>` : ""),
      schema: SCHEMAS.quiz,
    });
    const qs = (data && Array.isArray(data.questions) ? data.questions : [])
      .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer_index) && q.answer_index >= 0 && q.answer_index < q.options.length)
      .slice(0, count)
      .map((q) => {
        const opts = q.options.slice(0, 4).map((o) => String(o));
        const correct = opts[Math.min(q.answer_index, opts.length - 1)];
        const shuffled = M.util.shuffle(opts);
        return { question: q.question.trim(), options: shuffled, answer: shuffled.indexOf(correct), explanation: String(q.explanation || "").trim() };
      });
    if (!qs.length) throw new AIError("format");
    return qs;
  };

  const summarize = (title, body) =>
    generate({
      prompt: `Summarize these study notes titled "${title}" for revision.\nGive 5 to 8 bullet points with the key ideas, then one line that starts with "**Takeaway:**".\nWrite in ${language()}.\n\n<notes>\n${body}\n</notes>`,
      effort: "low",
    });

  const makePlan = async ({ exam, subject, days, minutesPerDay, topics }) => {
    const data = await generate({
      prompt:
        `Plan study sessions for this exam.\nExam: ${exam.title}\nSubject: ${subject}\nToday: ${M.util.today()}\nExam date: ${exam.date}\n` +
        `Available days: ${days.join(", ")}\nMaximum minutes per day: ${minutesPerDay}\n` +
        (topics ? `Topics from the student's notes:\n${topics}\n` : "") +
        "Use spaced practice: spread the topics out, revisit them, and finish with a full practice test the day before the exam. " +
        `Only use dates from the available days. Give each session a short, specific title (max 8 words) in ${language()}.`,
      schema: SCHEMAS.plan,
    });
    const allowed = new Set(days);
    return (data && Array.isArray(data.sessions) ? data.sessions : [])
      .filter((s) => s && allowed.has(s.date) && typeof s.title === "string" && s.title.trim())
      .map((s) => ({ date: s.date, title: s.title.trim().slice(0, 90), minutes: M.util.clamp(Number(s.minutes) || 25, 10, minutesPerDay) }))
      .slice(0, 30);
  };

  const ping = async () => {
    const c = client();
    try {
      const msg = await c.beta.messages.create({ ...base(model()), max_tokens: 64, messages: [{ role: "user", content: "Reply with the single word OK." }], output_config: { effort: "low" } });
      return { ok: true, model: msg.model };
    } catch (err) {
      throw classify(err);
    }
  };

  M.ai = { MODELS, AIError, hasKey, model, client, chat, generate, makeCards, makeQuiz, summarize, makePlan, ping, tutorSystem, errorText, classify };
})();
