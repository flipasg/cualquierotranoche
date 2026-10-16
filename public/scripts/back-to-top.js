(() => {
  const button = document.querySelector('.back-to-top');
  if (!button) return;

  const updateVisibility = () => {
    button.hidden = window.scrollY <= 160;
  };

  window.addEventListener('scroll', updateVisibility, { passive: true });
  window.addEventListener('pageshow', updateVisibility);
  updateVisibility();
})();
