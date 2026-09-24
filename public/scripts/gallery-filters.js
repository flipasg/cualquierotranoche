const galleries = document.querySelectorAll('[data-gallery]');

galleries.forEach((gallery) => {
  const cards = [...gallery.querySelectorAll('[data-gallery-card]')];
  const taxonomyParam = gallery.dataset.galleryTaxonomyParam;
  const statusButtons = [
    ...gallery.querySelectorAll('button[data-gallery-status]'),
  ];
  const taxonomyOptions = [
    ...gallery.querySelectorAll('[data-gallery-taxonomy-option]'),
  ];
  const allTaxonomies = gallery.querySelector('[data-gallery-taxonomy-all]');
  const taxonomySummary = gallery.querySelector(
    '[data-gallery-taxonomy-summary]',
  );
  const taxonomySelect = gallery.querySelector(
    '[data-gallery-taxonomy-select]',
  );
  const featuredButtons = [
    ...gallery.querySelectorAll('[data-gallery-featured]'),
  ];
  const chips = gallery.querySelector('[data-gallery-filter-chips]');
  const activeFilters = gallery.querySelector('[data-gallery-active-filters]');
  const empty = gallery.querySelector('[data-gallery-empty]');
  const clear = gallery.querySelector('[data-gallery-clear]');
  const filterPanel = gallery.querySelector('[data-gallery-filter-panel]');
  const configuredDefaultStatus =
    filterPanel?.dataset.galleryDefaultStatus ?? 'all';
  const defaultStatus = statusButtons.some(
    (button) => button.dataset.galleryStatus === configuredDefaultStatus,
  )
    ? configuredDefaultStatus
    : 'all';
  const pagination = gallery.querySelector('[data-flash-pagination]');
  const paginationLayout = gallery.querySelector('[data-gallery-pagination]');
  const pageSizeSelect = gallery.querySelector('[data-flash-page-size]');
  let pageSize = Number(pageSizeSelect?.value) || cards.length;
  let currentPage = 1;
  const url = new URL(window.location.href);
  let status = url.searchParams.get('status') ?? defaultStatus;
  let selected = new Set(
    (url.searchParams.get(taxonomyParam) ?? '')
      .split(',')
      .filter((id) => taxonomyOptions.some((option) => option.value === id)),
  );

  if (
    !statusButtons.some((button) => button.dataset.galleryStatus === status)
  ) {
    status = defaultStatus;
  }

  const labelWithoutCount = (label) =>
    label?.replace(/\s*\(.*\)\s*$/, '').trim();

  const updateUrl = () => {
    const nextUrl = new URL(window.location.href);
    if (status === defaultStatus) nextUrl.searchParams.delete('status');
    else nextUrl.searchParams.set('status', status);
    if (selected.size === 0) nextUrl.searchParams.delete(taxonomyParam);
    else nextUrl.searchParams.set(taxonomyParam, [...selected].join(','));
    window.history.replaceState({}, '', nextUrl);
  };

  const syncControls = () => {
    statusButtons.forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.galleryStatus === status),
      );
    });
    taxonomyOptions.forEach((option) => {
      option.checked = selected.has(option.value);
    });
    if (allTaxonomies) allTaxonomies.checked = selected.size === 0;
    if (taxonomySummary) {
      taxonomySummary.textContent =
        selected.size === 0
          ? (taxonomySummary.dataset.allLabel ?? taxonomySummary.textContent)
          : [...selected]
              .map((id) =>
                labelWithoutCount(
                  taxonomyOptions.find((option) => option.value === id)
                    ?.parentElement?.textContent,
                ),
              )
              .filter(Boolean)
              .join(', ');
    }
    featuredButtons.forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(selected.has(button.dataset.galleryFeatured)),
      );
    });
  };

  const render = () => {
    const visible = cards.filter((card) => {
      const statusMatches =
        status === 'all' || card.dataset.galleryStatus === status;
      const taxonomies = (card.dataset.galleryTaxonomies ?? '').split(' ');
      const taxonomyMatches =
        selected.size === 0 ||
        [...selected].some((id) => taxonomies.includes(id));
      return statusMatches && taxonomyMatches;
    });
    const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    cards.forEach((card) => {
      const index = visible.indexOf(card);
      card.hidden =
        index === -1 ||
        index < (currentPage - 1) * pageSize ||
        index >= currentPage * pageSize;
    });
    if (empty) empty.hidden = visible.length > 0;
    if (activeFilters && chips) {
      chips.replaceChildren();
      if (status !== defaultStatus) {
        const label = labelWithoutCount(
          statusButtons.find(
            (button) => button.dataset.galleryStatus === status,
          )?.textContent,
        );
        addChip(label, () => {
          status = defaultStatus;
          syncControls();
          render();
          updateUrl();
        });
      }
      selected.forEach((id) => {
        const option = taxonomyOptions.find((item) => item.value === id);
        addChip(labelWithoutCount(option?.parentElement?.textContent), () => {
          selected.delete(id);
          syncControls();
          render();
          updateUrl();
        });
      });
      activeFilters.hidden = status === defaultStatus && selected.size === 0;
    }
    if (paginationLayout) paginationLayout.hidden = visible.length === 0;
    if (pagination) {
      pagination.replaceChildren();
      pagination.hidden = pageCount === 1;
      if (pageCount > 1) {
        const previous = document.createElement('button');
        previous.type = 'button';
        previous.textContent = pagination.dataset.previousLabel ?? '';
        previous.disabled = currentPage === 1;
        previous.addEventListener('click', () => {
          currentPage -= 1;
          render();
        });
        const pageStatus = document.createElement('span');
        pageStatus.textContent = (pagination.dataset.pageStatus ?? '')
          .replace('{currentPage}', String(currentPage))
          .replace('{pageCount}', String(pageCount));
        const next = document.createElement('button');
        next.type = 'button';
        next.textContent = pagination.dataset.nextLabel ?? '';
        next.disabled = currentPage === pageCount;
        next.addEventListener('click', () => {
          currentPage += 1;
          render();
        });
        pagination.append(previous, pageStatus, next);
      }
    }
  };

  const addChip = (label, remove) => {
    if (!label || !chips) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = `${label} ×`;
    chip.addEventListener('click', remove);
    chips.append(chip);
  };

  statusButtons.forEach((button) => {
    button.addEventListener('click', () => {
      status = button.dataset.galleryStatus ?? defaultStatus;
      currentPage = 1;
      syncControls();
      render();
      updateUrl();
    });
  });
  taxonomyOptions.forEach((option) => {
    option.addEventListener('change', () => {
      if (option.checked) selected.add(option.value);
      else selected.delete(option.value);
      currentPage = 1;
      syncControls();
      render();
      updateUrl();
    });
  });
  allTaxonomies?.addEventListener('change', () => {
    selected = new Set();
    currentPage = 1;
    syncControls();
    render();
    updateUrl();
  });
  document.addEventListener('click', (event) => {
    if (taxonomySelect?.open && !taxonomySelect.contains(event.target)) {
      taxonomySelect.open = false;
    }
  });
  featuredButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.galleryFeatured;
      if (!id) return;
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      currentPage = 1;
      syncControls();
      render();
      updateUrl();
    });
  });
  clear?.addEventListener('click', () => {
    status = defaultStatus;
    selected = new Set();
    currentPage = 1;
    syncControls();
    render();
    updateUrl();
  });
  pageSizeSelect?.addEventListener('change', () => {
    pageSize = Number(pageSizeSelect.value) || cards.length;
    currentPage = 1;
    render();
  });
  const compact = window.matchMedia('(max-width: 699px)');
  const syncPanel = () => {
    if (filterPanel) filterPanel.open = !compact.matches;
  };
  compact.addEventListener('change', syncPanel);
  syncPanel();
  if (taxonomySummary)
    taxonomySummary.dataset.allLabel = taxonomySummary.textContent;
  syncControls();
  render();
});
