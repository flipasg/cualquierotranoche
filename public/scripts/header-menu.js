const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('.menu-toggle');
const menuLabel = menuToggle?.querySelector('.sr-only');

if (header && menuToggle) {
  const updateHeader = () => {
    const isCompact = window.innerWidth < 900;
    header.classList.toggle('is-compact', isCompact);

    if (!isCompact) {
      header.dataset.menuOpen = 'false';
      menuToggle.setAttribute('aria-expanded', 'false');
      if (menuLabel) menuLabel.textContent = menuLabel.dataset.openLabel;
    }
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
  });

  updateHeader();
  window.addEventListener('resize', updateHeader);
}
