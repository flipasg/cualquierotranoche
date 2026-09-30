const galleries = document.querySelectorAll('[data-gallery]');
let pageScrollFrame;
let originalPageScrollBehavior;

const scrollPageTo = (top) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top, behavior: 'auto' });
    return;
  }

  if (pageScrollFrame !== undefined) cancelAnimationFrame(pageScrollFrame);
  const scrollingElement = document.scrollingElement;
  const start = scrollingElement.scrollTop;
  const distance = top - start;
  const startedAt = performance.now();
  const duration = 420;
  if (pageScrollFrame === undefined) {
    originalPageScrollBehavior = scrollingElement.style.scrollBehavior;
    scrollingElement.style.scrollBehavior = 'auto';
  }
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    scrollingElement.scrollTop = start + distance * eased;
    if (progress < 1) pageScrollFrame = requestAnimationFrame(tick);
    else {
      pageScrollFrame = undefined;
      scrollingElement.style.scrollBehavior = originalPageScrollBehavior;
    }
  };
  pageScrollFrame = requestAnimationFrame(tick);
};

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
    '[data-gallery-taxonomy-summary-label]',
  );
  const taxonomySearch = gallery.querySelector(
    '[data-gallery-taxonomy-search]',
  );
  const selectedTaxonomies = gallery.querySelector(
    '[data-gallery-taxonomy-selected]',
  );
  const unselectedTaxonomies = gallery.querySelector(
    '[data-gallery-taxonomy-unselected]',
  );
  const selectedTaxonomySection = gallery.querySelector(
    '[data-gallery-taxonomy-selected-section]',
  );
  const globalSearch = gallery.querySelector('[data-gallery-search]');
  const searchParam = gallery.dataset.gallerySearchParam;
  const compact = window.matchMedia('(max-width: 767px)');
  const taxonomySelect = gallery.querySelector(
    '[data-gallery-taxonomy-select]',
  );
  const featuredButtons = [
    ...gallery.querySelectorAll('[data-gallery-featured]'),
  ];
  const chips = gallery.querySelector('[data-gallery-filter-chips]');
  const activeFilters = gallery.querySelector('[data-gallery-active-filters]');
  const empty = gallery.querySelector('[data-gallery-empty]');
  const clearButtons = [...gallery.querySelectorAll('[data-gallery-clear]')];
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
  const resultsGrid = gallery.querySelector('[data-flash-grid]');
  const pageSize = Number(pagination?.dataset.pageSize) || cards.length || 1;
  let currentPage = 1;
  const url = new URL(window.location.href);
  let status = url.searchParams.get('status') ?? defaultStatus;
  let selected = new Set(
    (url.searchParams.get(taxonomyParam) ?? '')
      .split(',')
      .filter((id) => taxonomyOptions.some((option) => option.value === id)),
  );
  let searchTerm = searchParam ? (url.searchParams.get(searchParam) ?? '') : '';

  if (
    !statusButtons.some((button) => button.dataset.galleryStatus === status)
  ) {
    status = defaultStatus;
  }

  const labelWithoutCount = (label) =>
    label?.replace(/\s*\(.*\)\s*$/, '').trim();
  const normalize = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  const syncAppliedFilters = () => {
    const appliedToggle = gallery.querySelector(
      '[data-gallery-applied-toggle]',
    );
    if (!appliedToggle || !chips) return;
    const expanded =
      !compact.matches ||
      appliedToggle.getAttribute('aria-expanded') === 'true';
    appliedToggle.setAttribute('aria-expanded', String(expanded));
    chips.hidden = !expanded;
  };

  const scrollToResults = () => {
    if (!resultsGrid) return;
    resultsGrid.focus({ preventScroll: true });
    const headerHeight =
      document.querySelector('.header')?.getBoundingClientRect().height ?? 0;
    const top =
      resultsGrid.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      16;
    scrollPageTo(Math.max(0, top));
  };

  const updateUrl = () => {
    const nextUrl = new URL(window.location.href);
    if (status === defaultStatus) nextUrl.searchParams.delete('status');
    else nextUrl.searchParams.set('status', status);
    if (selected.size === 0) nextUrl.searchParams.delete(taxonomyParam);
    else nextUrl.searchParams.set(taxonomyParam, [...selected].join(','));
    if (searchParam && searchTerm.trim())
      nextUrl.searchParams.set(searchParam, searchTerm.trim());
    else if (searchParam) nextUrl.searchParams.delete(searchParam);
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
    const taxonomyQuery = normalize(taxonomySearch?.value ?? '');
    let visibleSelected = 0;
    taxonomyOptions.forEach((option) => {
      const row = option.closest('[data-gallery-taxonomy-row]');
      if (!row) return;
      const matches = normalize(row.textContent ?? '').includes(taxonomyQuery);
      row.hidden = !matches;
      if (selected.has(option.value)) {
        selectedTaxonomies?.append(row);
        if (matches) visibleSelected += 1;
      } else {
        unselectedTaxonomies?.append(row);
      }
    });
    if (selectedTaxonomySection)
      selectedTaxonomySection.hidden = visibleSelected === 0;
    if (globalSearch) globalSearch.value = searchTerm;
    const activeCount =
      Number(status !== defaultStatus) +
      selected.size +
      Number(Boolean(searchTerm.trim()));
    const filterSummary = gallery.querySelector(
      '[data-gallery-filter-summary]',
    );
    if (filterSummary)
      filterSummary.textContent = activeCount
        ? `Filtros (${activeCount})`
        : 'Filtros';
    clearButtons.forEach((button) => {
      button.hidden = activeCount === 0;
    });
    syncAppliedFilters();
  };

  const render = () => {
    const visible = cards.filter((card) => {
      const statusMatches =
        status === 'all' || card.dataset.galleryStatus === status;
      const taxonomies = (card.dataset.galleryTaxonomies ?? '').split(' ');
      const taxonomyMatches =
        selected.size === 0 ||
        [...selected].some((id) => taxonomies.includes(id));
      const title = card.querySelector('h3')?.textContent ?? '';
      const searchMatches =
        !searchTerm.trim() ||
        normalize(title).includes(normalize(searchTerm.trim()));
      return statusMatches && taxonomyMatches && searchMatches;
    });
    const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const newlyVisible = [];
    cards.forEach((card) => {
      const index = visible.indexOf(card);
      const hidden =
        index === -1 ||
        index < (currentPage - 1) * pageSize ||
        index >= currentPage * pageSize;
      if (card.hidden && !hidden) newlyVisible.push(card);
      card.hidden = hidden;
    });
    if (newlyVisible.length)
      window.refreshScrollReveal?.(newlyVisible, { restart: true });
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
      if (searchTerm.trim()) {
        addChip(`“${searchTerm.trim()}”`, () => {
          searchTerm = '';
          syncControls();
          render();
          updateUrl();
        });
      }
      activeFilters.hidden =
        status === defaultStatus && selected.size === 0 && !searchTerm.trim();
      syncAppliedFilters();
    }
    if (paginationLayout) paginationLayout.hidden = pageCount === 1;
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
          scrollToResults();
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
          scrollToResults();
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
  taxonomySearch?.addEventListener('input', () => syncControls());
  globalSearch?.addEventListener('input', () => {
    searchTerm = globalSearch.value;
    currentPage = 1;
    syncControls();
    render();
    updateUrl();
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
  clearButtons.forEach((button) =>
    button.addEventListener('click', () => {
      status = defaultStatus;
      selected = new Set();
      searchTerm = '';
      if (taxonomySearch) taxonomySearch.value = '';
      currentPage = 1;
      syncControls();
      render();
      updateUrl();
    }),
  );
  const appliedToggle = gallery.querySelector('[data-gallery-applied-toggle]');
  appliedToggle?.addEventListener('click', () => {
    const expanded = appliedToggle.getAttribute('aria-expanded') !== 'true';
    appliedToggle.setAttribute('aria-expanded', String(expanded));
    if (chips) chips.hidden = !expanded;
  });
  const syncPanel = () => {
    if (filterPanel) filterPanel.open = !compact.matches;
    syncAppliedFilters();
  };
  compact.addEventListener('change', syncPanel);
  syncPanel();
  if (taxonomySummary)
    taxonomySummary.dataset.allLabel = taxonomySummary.textContent;
  syncControls();
  render();
});
