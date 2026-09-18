let pageSize = 6;
const filterButtons = document.querySelectorAll('[data-flash-category]');
const cards = [...document.querySelectorAll('[data-flash-card]')];
const pagination = document.querySelector('[data-flash-pagination]');
const emptyMessage = document.querySelector('[data-flash-empty]');
const pageSizeSelect = document.querySelector('[data-flash-page-size]');
let selectedCategory =
  document.querySelector('[data-flash-category][aria-pressed="true"]')?.dataset
    .flashCategory ?? 'all';
let currentPage = 1;

const render = () => {
  const selectedCards = cards.filter(
    (card) =>
      selectedCategory === 'all' ||
      card.dataset.flashCategories?.split(' ').includes(selectedCategory),
  );
  const pageCount = Math.max(1, Math.ceil(selectedCards.length / pageSize));
  currentPage = Math.min(currentPage, pageCount);
  if (emptyMessage) emptyMessage.hidden = selectedCards.length > 0;

  cards.forEach((card) => {
    const index = selectedCards.indexOf(card);
    card.hidden =
      index === -1 ||
      index < (currentPage - 1) * pageSize ||
      index >= currentPage * pageSize;
  });

  if (!pagination) return;
  pagination.replaceChildren();
  pagination.hidden = pageCount === 1;
  if (pageCount === 1) return;

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'button secondary';
  previous.textContent = pagination.dataset.previousLabel ?? '';
  previous.disabled = currentPage === 1;
  previous.addEventListener('click', () => {
    currentPage -= 1;
    render();
  });

  const status = document.createElement('span');
  status.textContent = (pagination.dataset.pageStatus ?? '')
    .replace('{currentPage}', String(currentPage))
    .replace('{pageCount}', String(pageCount));

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'button secondary';
  next.textContent = pagination.dataset.nextLabel ?? '';
  next.disabled = currentPage === pageCount;
  next.addEventListener('click', () => {
    currentPage += 1;
    render();
  });

  pagination.append(previous, status, next);
};

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedCategory = button.dataset.flashCategory ?? 'all';
    currentPage = 1;
    filterButtons.forEach((filter) => {
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    render();
  });
});

pageSizeSelect?.addEventListener('change', () => {
  pageSize = Number(pageSizeSelect.value);
  currentPage = 1;
  render();
});

render();
