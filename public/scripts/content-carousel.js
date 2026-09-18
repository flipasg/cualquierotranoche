const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? 'auto'
  : 'smooth';

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  if (carousel.dataset.carouselReady) return;
  carousel.dataset.carouselReady = 'true';

  const track = carousel.querySelector('[data-carousel-track]');
  const previous = carousel.querySelector('[data-carousel-previous]');
  const next = carousel.querySelector('[data-carousel-next]');
  const controls = carousel.querySelector('[data-carousel-controls]');

  if (!track || !previous || !next || !controls) return;

  const updateControls = () => {
    controls.hidden = track.scrollWidth <= track.clientWidth + 1;
  };

  const scroll = (direction) => {
    track.scrollBy({
      left: direction * track.clientWidth * 0.85,
      behavior,
    });
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
