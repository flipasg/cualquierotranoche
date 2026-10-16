const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('.menu-toggle');
const menuLabel = menuToggle?.querySelector('.sr-only');

if (header && menuToggle) {
  const tablet = window.matchMedia(
    '(min-width: 768px) and (max-width: 1023px)',
  );
  let previousScrollCompact = false;
  const updateHeader = () => {
    const isCompact = window.innerWidth < 1024;
    header.classList.toggle('is-compact', isCompact);
    const scrolledCompact = tablet.matches && window.scrollY > 80;
    if (scrolledCompact !== previousScrollCompact) {
      header.classList.toggle('is-scrolled', scrolledCompact);
      previousScrollCompact = scrolledCompact;
    }

    if (!isCompact) {
      header.dataset.menuOpen = 'false';
      menuToggle.setAttribute('aria-expanded', 'false');
      if (menuLabel) menuLabel.textContent = menuLabel.dataset.openLabel;
    }
    document.documentElement.style.setProperty(
      '--header-height',
      `${header.getBoundingClientRect().height}px`,
    );
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = header.dataset.menuOpen === 'true';
    header.dataset.menuOpen = String(!isOpen);
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    if (menuLabel) {
      menuLabel.textContent = isOpen
        ? menuLabel.dataset.openLabel
        : menuLabel.dataset.closeLabel;
    }
    requestAnimationFrame(updateHeader);
  });

  updateHeader();
  header
    .querySelector('.header-inner')
    ?.addEventListener('transitionend', () => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    });
  window.addEventListener('resize', updateHeader);
  window.addEventListener('scroll', updateHeader, { passive: true });
}
