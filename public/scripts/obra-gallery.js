document.querySelectorAll('[data-obra-gallery]').forEach((gallery) => {
  const mainLink = gallery.querySelector('[data-image-viewer-trigger]');
  const mainImage = mainLink?.querySelector('img');
  const media = gallery.querySelector('.obra-detail__media');
  const thumbnails = [
    ...gallery.querySelectorAll('[data-obra-image-thumbnail]'),
  ];
  const previous = gallery.querySelector('[data-obra-image-previous]');
  const next = gallery.querySelector('[data-obra-image-next]');
  const count = gallery.querySelector('[data-obra-image-count]');
  if (
    !mainLink ||
    !mainImage ||
    !media ||
    !previous ||
    !next ||
    !count ||
    !thumbnails.length
  )
    return;

  const syncMediaWidth = () => {
    const imageWidth = Number(mainImage.getAttribute('width'));
    const imageHeight = Number(mainImage.getAttribute('height'));
    const maxHeight = Number.parseFloat(getComputedStyle(mainImage).maxHeight);
    if (!imageWidth || !imageHeight || !maxHeight) return;
    const scale = Math.min(
      1,
      gallery.clientWidth / imageWidth,
      maxHeight / imageHeight,
    );
    media.style.width = `${imageWidth * scale}px`;
  };
  syncMediaWidth();
  new ResizeObserver(syncMediaWidth).observe(mainImage);
  window.addEventListener('resize', syncMediaWidth);

  let activeIndex = 0;

  const activate = (index) => {
    const thumbnail = thumbnails[index];
    if (!thumbnail) return;
    activeIndex = index;
    const image = thumbnail.querySelector('img');
    if (!image) return;
    const source = image.getAttribute('src') || image.src;
    mainLink.href = source;
    mainImage.src = source;
    mainImage.removeAttribute('srcset');
    mainImage.alt = image.alt;
    mainLink.setAttribute('aria-label', `Ampliar imagen: ${image.alt}`);
    thumbnails.forEach((thumbnail, thumbnailIndex) => {
      thumbnail.setAttribute('aria-pressed', String(thumbnailIndex === index));
    });
    previous.disabled = index === 0;
    next.disabled = index === thumbnails.length - 1;
    count.textContent = `${index + 1} / ${thumbnails.length}`;
  };

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => activate(index));
  });
  previous.addEventListener('click', () => activate(activeIndex - 1));
  next.addEventListener('click', () => activate(activeIndex + 1));
});
