const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  if (carousel.dataset.carouselReady) return;
  carousel.dataset.carouselReady = 'true';

  const track = carousel.querySelector('[data-carousel-track]');
  const previous = carousel.querySelector('[data-carousel-previous]');
  const next = carousel.querySelector('[data-carousel-next]');
  const controls = carousel.querySelector('[data-carousel-controls]');
  let animationFrame;
  let originalScrollBehavior;
  let originalScrollSnapType;

  if (!track || !previous || !next || !controls) return;

  const updateControls = () => {
    controls.hidden = track.scrollWidth <= track.clientWidth + 1;
  };

  const animateScroll = (target) => {
    if (prefersReducedMotion()) {
      track.scrollLeft = target;
      return;
    }

    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    const start = track.scrollLeft;
    const distance = target - start;
    const startedAt = performance.now();
    const duration = 420;
    if (animationFrame === undefined) {
      originalScrollBehavior = track.style.scrollBehavior;
      originalScrollSnapType = track.style.scrollSnapType;
      track.style.scrollBehavior = 'auto';
      track.style.scrollSnapType = 'none';
    }
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      track.scrollLeft = start + distance * eased;
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
      else {
        animationFrame = undefined;
        track.style.scrollBehavior = originalScrollBehavior;
        track.style.scrollSnapType = originalScrollSnapType;
      }
    };
    animationFrame = requestAnimationFrame(tick);
  };

  const scroll = (direction) => {
    const items = [...track.querySelectorAll('.carousel-item')];
    const positions = items.map((item) => item.offsetLeft);
    if (positions.length === 0) return;
    const current = positions.reduce(
      (closest, position, index) =>
        Math.abs(position - track.scrollLeft) <
        Math.abs(positions[closest] - track.scrollLeft)
          ? index
          : closest,
      0,
    );
    const targetIndex = Math.max(
      0,
      Math.min(positions.length - 1, current + direction),
    );

    animateScroll(positions[targetIndex] ?? track.scrollLeft);
  };

  previous.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') scroll(-1);
    if (event.key === 'ArrowRight') scroll(1);
  });

  track.querySelectorAll('img').forEach((image) => {
    image.addEventListener('load', updateControls);
  });
  new ResizeObserver(updateControls).observe(track);
  requestAnimationFrame(updateControls);
});
