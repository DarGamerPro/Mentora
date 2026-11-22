(() => {
  const { today, addDays } = M.util;
  const MAX_DAYS = 3650;
  const MIN_EASE = 1.3;
  const MAX_EASE = 3.0;

  const next = (card, rating) => {
    const reps = card.reps || 0;
    const ivl = card.interval || 0;
    const ease = card.ease || 2.5;
    if (rating === 0) return { reps: 0, interval: 0, ease: Math.max(MIN_EASE, +(ease - 0.2).toFixed(2)), lapse: true };
    const good = reps === 0 ? 2 : Math.max(ivl + 1, Math.round(ivl * ease));
    let hard = reps === 0 ? 1 : Math.max(1, Math.round(ivl * 1.2));
    if (good > 1) hard = Math.min(hard, good - 1);
    const easy = reps === 0 ? 4 : Math.max(good + 1, Math.round(good * 1.3));
    const table = {
      1: [hard, Math.max(MIN_EASE, +(ease - 0.15).toFixed(2))],
      2: [good, ease],
      3: [easy, Math.min(MAX_EASE, +(ease + 0.15).toFixed(2))],
    };
    const [interval, newEase] = table[rating];
    return { reps: reps + 1, interval: Math.min(MAX_DAYS, interval), ease: newEase, lapse: false };
  };

  const apply = (card, rating) => {
    const n = next(card, rating);
    if (n.lapse) card.lapses = (card.lapses || 0) + 1;
    card.reps = n.reps;
    card.interval = n.interval;
    card.ease = n.ease;
    card.due = addDays(today(), n.interval);
    card.lastReviewed = today();
    return n;
  };

  const preview = (card) => [0, 1, 2, 3].map((r) => next(card, r).interval);

  const status = (card) => {
    if (!card.reps && !card.lastReviewed) return "new";
    return (card.interval || 0) >= 21 ? "mastered" : "learning";
  };

  const label = (days) => {
    if (days <= 0) return M.t("srs.now");
    if (days < 30) return `${days} ${M.t("unit.d")}`;
    if (days < 365) return `${Math.round(days / 30)} ${M.t("unit.mo")}`;
    return `${(days / 365).toFixed(1)} ${M.t("unit.y")}`;
  };

  const queue = (subjectId, limit = 40) => {
    const due = M.store.dueCards(subjectId);
    const seen = due.filter((c) => status(c) !== "new").sort((a, b) => (a.due || "").localeCompare(b.due || ""));
    const fresh = due.filter((c) => status(c) === "new");
    return seen.concat(fresh).slice(0, limit);
  };

  M.srs = { next, apply, preview, status, label, queue };
})();
