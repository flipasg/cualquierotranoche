const filters = document.querySelectorAll('.filters button');
const cards = document.querySelectorAll('[data-work-card]');

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    const type = filter.dataset.filter;
    const collection = filter.dataset.collection;

    cards.forEach((card) => {
      const matchesCollection = card.dataset.collection === collection;
      const isAvailable = card.dataset.status === 'disponible';
      card.hidden =
        type === 'collection'
          ? !matchesCollection
          : type === 'available'
            ? !isAvailable
            : false;
    });

    filters.forEach((button) => {
      button.setAttribute('aria-pressed', String(button === filter));
    });
  });
});
