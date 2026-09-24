const isHidden = (element) => Boolean(element.closest('[hidden]'));

const collectRevealTargets = (roots, root = document) => {
  const candidates = roots
    ? Array.isArray(roots)
      ? roots
      : [roots]
    : [...root.querySelectorAll('[data-reveal]')];

  return [
    ...new Set(
      candidates.flatMap((candidate) => [
        ...(candidate.matches?.('[data-reveal]') ? [candidate] : []),
        ...(candidate.querySelectorAll?.('[data-reveal]') ?? []),
      ]),
    ),
  ].filter((target) => {
    const carousel = target.closest('[data-carousel]');
    return !carousel || carousel === target;
  });
};

export function initScrollReveal(root = document) {
  const targets = collectRevealTargets(null, root);
  const reducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (!targets.length || reducedMotion) return;

  root.documentElement.dataset.motionReady = 'true';
  const reveal = (target, { restart = false } = {}) => {
    if (isHidden(target)) return;
    if (!restart && target.dataset.revealState === 'revealed') return;

    target.dataset.revealState = 'pending';
    requestAnimationFrame(() => {
      if (!isHidden(target)) target.dataset.revealState = 'revealed';
    });
  };

  const groups = new Map();
  targets.forEach((target) => {
    const group = target.closest('[data-reveal-group]');
    if (!group) return;
    const members = groups.get(group) ?? [];
    members.push(target);
    groups.set(group, members);
  });
  groups.forEach((members) => {
    members.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${(index % 3) * 60}ms`);
    });
  });

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              observer.unobserve(entry.target);
              reveal(entry.target);
            });
          },
          { threshold: 0.12 },
        )
      : null;

  targets.forEach((target) => {
    if (isHidden(target)) return;
    target.dataset.revealState = 'pending';
    if (observer) observer.observe(target);
    else reveal(target);
  });

  window.refreshScrollReveal = (roots, options) => {
    collectRevealTargets(roots, root).forEach((target) => {
      if (isHidden(target)) return;
      observer?.unobserve(target);
      reveal(target, options);
    });
  };
}

if (typeof document !== 'undefined') initScrollReveal();
