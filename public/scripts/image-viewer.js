const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function fitImage(image, viewport) {
  const ratio = Math.min(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  return { width: image.width * ratio, height: image.height * ratio };
}

export function constrainView(view, image, viewport) {
  const scale = clamp(view.scale, MIN_ZOOM, MAX_ZOOM);
  const maxX = Math.max(0, (image.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (image.height * scale - viewport.height) / 2);
  return {
    scale,
    x: maxX ? clamp(view.x, -maxX, maxX) : 0,
    y: maxY ? clamp(view.y, -maxY, maxY) : 0,
  };
}

export function zoomAt(view, scale, point, image, viewport) {
  const nextScale = clamp(scale, MIN_ZOOM, MAX_ZOOM);
  const ratio = nextScale / view.scale;
  return constrainView(
    {
      scale: nextScale,
      x: point.x - (point.x - view.x) * ratio,
      y: point.y - (point.y - view.y) * ratio,
    },
    image,
    viewport,
  );
}

export function initImageViewer(root = document) {
  const dialog = root.querySelector('#image-viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const viewport = dialog.querySelector('[data-viewer-viewport]');
  const image = dialog.querySelector('[data-viewer-image]');
  const caption = dialog.querySelector('[data-viewer-caption]');
  const captionToggle = dialog.querySelector('[data-viewer-caption-toggle]');
  const descriptionWrap = dialog.querySelector(
    '[data-viewer-description-wrap]',
  );
  const description = dialog.querySelector('[data-viewer-description]');
  const message = dialog.querySelector('[data-viewer-message]');
  const zoomLabel = dialog.querySelector('[data-viewer-zoom]');
  const zoomIn = dialog.querySelector('[data-viewer-in]');
  const zoomOut = dialog.querySelector('[data-viewer-out]');
  const reset = dialog.querySelector('[data-viewer-reset]');
  const close = dialog.querySelector('[data-viewer-close]');
  const previous = dialog.querySelector('[data-viewer-previous]');
  const next = dialog.querySelector('[data-viewer-next]');
  const navigation = dialog.querySelector('[data-viewer-navigation]');
  const count = dialog.querySelector('[data-viewer-count]');
  const win = root.defaultView;
  let view = { scale: 1, x: 0, y: 0 };
  let fitted = { width: 0, height: 0 };
  let ready = false;
  let opener;
  let galleryTriggers = [];
  let activeIndex = -1;
  let previousOverflow;
  let bodyStyles;
  let scrollPosition;
  let resizeFrame;
  let closeTimer;
  let tapTimer;
  let lastTap;
  let lastTouchTime = -Infinity;
  let multiplePointers = false;
  const pointers = new Map();
  const bounds = () => ({
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  });

  const showControls = (visible = true) => {
    dialog.dataset.controlsHidden = String(!visible);
  };
  const clearGesture = () => {
    for (const id of pointers.keys()) {
      if (viewport.hasPointerCapture?.(id)) viewport.releasePointerCapture(id);
    }
    pointers.clear();
    clearTimeout(tapTimer);
    lastTap = undefined;
    multiplePointers = false;
    viewport.dataset.dragging = 'false';
  };
  const render = (animate = false) => {
    viewport.dataset.animate = String(animate);
    image.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    zoomLabel.textContent = `${Math.round(view.scale * 100)} %`;
    zoomIn.disabled = !ready || view.scale >= MAX_ZOOM;
    zoomOut.disabled = !ready || view.scale <= MIN_ZOOM;
    reset.disabled = !ready || view.scale === MIN_ZOOM;
    viewport.dataset.zoomed = String(ready && view.scale > MIN_ZOOM);
  };
  const renderNavigation = () => {
    const hasNavigation = galleryTriggers.length > 1;
    navigation.hidden = !hasNavigation;
    previous.hidden = !hasNavigation;
    next.hidden = !hasNavigation;
    previous.disabled = activeIndex <= 0;
    next.disabled =
      activeIndex < 0 || activeIndex >= galleryTriggers.length - 1;
    count.textContent = hasNavigation
      ? `${activeIndex + 1} / ${galleryTriggers.length}`
      : '';
  };
  const updateCaption = () => {
    captionToggle.hidden =
      caption.dataset.expanded !== 'true' &&
      caption.scrollHeight <= caption.clientHeight + 1;
  };
  const fit = (resetView = false) => {
    if (!dialog.open || !ready) return;
    const size = bounds();
    if (!size.width || !size.height) return;
    const oldFit = fitted;
    fitted = fitImage(
      { width: image.naturalWidth, height: image.naturalHeight },
      size,
    );
    image.style.width = `${fitted.width}px`;
    image.style.height = `${fitted.height}px`;
    // Keep the viewed detail stable through rotation, caption expansion and browser chrome changes.
    view =
      resetView || !oldFit.width
        ? { scale: 1, x: 0, y: 0 }
        : constrainView(
            {
              ...view,
              x: (view.x * fitted.width) / oldFit.width,
              y: (view.y * fitted.height) / oldFit.height,
            },
            fitted,
            size,
          );
    render();
  };
  const zoom = (scale, point = { x: 0, y: 0 }, animate = true) => {
    if (!ready) return;
    view = zoomAt(view, scale, point, fitted, bounds());
    render(animate);
  };
  const pointFromEvent = (event) => {
    const rect = viewport.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  };
  const loaded = () => {
    if (!dialog.open) return;
    ready = image.naturalWidth > 0;
    image.hidden = !ready;
    message.hidden = ready;
    viewport.setAttribute('aria-busy', 'false');
    if (ready) fit(true);
    else {
      message.textContent =
        'No se ha podido cargar la imagen. Cierra el visor e inténtalo de nuevo.';
      render();
    }
  };
  const loadTrigger = (trigger) => {
    clearGesture();
    showControls();
    ready = false;
    view = { scale: 1, x: 0, y: 0 };
    image.hidden = true;
    const thumbnail = trigger.querySelector('img');
    caption.textContent = trigger.dataset.viewerTitle || thumbnail.alt;
    image.alt = thumbnail.alt;
    caption.dataset.expanded = 'false';
    captionToggle.setAttribute('aria-expanded', 'false');
    captionToggle.textContent = 'Ver más';
    const descriptionText = trigger.dataset.viewerDescription || '';
    description.textContent = descriptionText;
    descriptionWrap.hidden = !descriptionText.trim();
    descriptionWrap.open = false;
    updateCaption();
    message.textContent = 'Cargando imagen…';
    message.hidden = false;
    viewport.setAttribute('aria-busy', 'true');
    render();
    renderNavigation();
    image.src = trigger.href;
    if (image.complete) loaded();
  };
  const navigate = (offset) => {
    const index = activeIndex + offset;
    if (index < 0 || index >= galleryTriggers.length) return;
    activeIndex = index;
    loadTrigger(galleryTriggers[index]);
  };
  const requestClose = () => {
    if (!dialog.open || dialog.dataset.closing === 'true') return;
    clearGesture();
    if (win?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return;
    }
    dialog.dataset.closing = 'true';
    // Fallback for browsers that do not deliver animationend (e.g. background tabs).
    closeTimer = setTimeout(() => dialog.close(), 200);
  };
  image.addEventListener('load', loaded);
  image.addEventListener('error', loaded);
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-image-viewer-trigger]');
    if (
      !trigger ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (dialog.open) return;
    opener = trigger;
    const group = trigger.dataset.viewerGroup;
    galleryTriggers = group
      ? [...root.querySelectorAll('[data-image-viewer-trigger]')].filter(
          (item) => item.dataset.viewerGroup === group,
        )
      : [trigger];
    if (!galleryTriggers.includes(trigger)) galleryTriggers.push(trigger);
    activeIndex = galleryTriggers.indexOf(trigger);
    previousOverflow = root.documentElement.style.overflow;
    // Fixed-body locking also prevents background rubber-banding in mobile Safari.
    if (root.body && win) {
      scrollPosition = { x: win.scrollX, y: win.scrollY };
      bodyStyles = Object.fromEntries(
        ['position', 'top', 'left', 'width'].map((key) => [
          key,
          root.body.style[key],
        ]),
      );
      Object.assign(root.body.style, {
        position: 'fixed',
        top: `${-scrollPosition.y}px`,
        left: `${-scrollPosition.x}px`,
        width: '100%',
      });
    }
    root.documentElement.style.overflow = 'hidden';
    dialog.dataset.closing = 'false';
    dialog.showModal();
    loadTrigger(trigger);
  });
  previous.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  close.addEventListener('click', requestClose);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener('animationend', (event) => {
    if (event.target === dialog && event.animationName === 'viewer-close')
      dialog.close();
  });
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer);
    if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
    resizeFrame = undefined;
    clearGesture();
    dialog.dataset.closing = 'false';
    root.documentElement.style.overflow = previousOverflow;
    if (bodyStyles) {
      Object.assign(root.body.style, bodyStyles);
      win.scrollTo({
        left: scrollPosition.x,
        top: scrollPosition.y,
        behavior: 'instant',
      });
      bodyStyles = undefined;
    }
    ready = false;
    image.removeAttribute('src');
    galleryTriggers = [];
    activeIndex = -1;
    renderNavigation();
    opener?.focus({ preventScroll: true });
  });
  zoomIn.addEventListener('click', () => zoom(view.scale + 0.5));
  zoomOut.addEventListener('click', () => zoom(view.scale - 0.5));
  reset.addEventListener('click', () => zoom(1));
  captionToggle.addEventListener('click', () => {
    const expanded = caption.dataset.expanded !== 'true';
    caption.dataset.expanded = String(expanded);
    captionToggle.setAttribute('aria-expanded', String(expanded));
    captionToggle.textContent = expanded ? 'Ver menos' : 'Ver más';
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    showControls();
    if (event.key === 'Tab') {
      const focusable = [
        ...dialog.querySelectorAll(
          'button:not(:disabled), [tabindex="0"], summary',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length && !element.closest('[hidden]'),
      );
      if (focusable.length) {
        // Safari may skip buttons depending on keyboard settings; cycle explicitly.
        const index = focusable.indexOf(root.activeElement);
        const nextIndex =
          index < 0
            ? event.shiftKey
              ? focusable.length - 1
              : 0
            : (index + (event.shiftKey ? -1 : 1) + focusable.length) %
              focusable.length;
        event.preventDefault();
        focusable[nextIndex].focus();
      }
      return;
    }
    if (dialog.dataset.closing === 'true') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (galleryTriggers.length < 2) return;
      navigate(event.key === 'ArrowLeft' ? -1 : 1);
    } else {
      if (!ready) return;
      switch (event.key) {
        case '+':
        case '=':
          zoom(view.scale + 0.5);
          break;
        case '-':
          zoom(view.scale - 0.5);
          break;
        case '0':
          zoom(1);
          break;
        default:
          return;
      }
    }
    event.preventDefault();
  });
  viewport.addEventListener(
    'wheel',
    (event) => {
      if (!ready) return;
      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.clientHeight
            : 1);
      zoom(
        view.scale * Math.exp(-clamp(delta, -100, 100) * 0.01),
        pointFromEvent(event),
        false,
      );
    },
    { passive: false },
  );
  viewport.addEventListener('dblclick', (event) => {
    event.preventDefault();
    if (event.timeStamp - lastTouchTime < 500) return;
    zoom(view.scale > 1 ? 1 : 2, pointFromEvent(event));
  });
  root.addEventListener('dblclick', (event) => {
    if (event.target.closest?.('[data-image-viewer-trigger]'))
      event.preventDefault();
  });
  viewport.addEventListener('pointerdown', (event) => {
    if (!ready || event.button !== 0 || dialog.dataset.closing === 'true')
      return;
    clearTimeout(tapTimer);
    const point = pointFromEvent(event);
    pointers.set(event.pointerId, {
      point,
      start: point,
      moved: false,
      time: event.timeStamp,
    });
    viewport.setPointerCapture(event.pointerId);
    viewport.dataset.dragging = 'true';
    viewport.dataset.animate = 'false';
    if (pointers.size > 1) {
      multiplePointers = true;
      clearTimeout(tapTimer);
      lastTap = undefined;
    }
  });
  viewport.addEventListener('pointermove', (event) => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const point = pointFromEvent(event);
    const old = pointer.point;
    const other = [...pointers.entries()].find(
      ([id]) => id !== event.pointerId,
    )?.[1].point;
    if (Math.hypot(point.x - pointer.start.x, point.y - pointer.start.y) > 8)
      pointer.moved = true;
    if (other) {
      const oldDistance = Math.hypot(old.x - other.x, old.y - other.y);
      const newDistance = Math.hypot(point.x - other.x, point.y - other.y);
      const scale = clamp(
        oldDistance ? (view.scale * newDistance) / oldDistance : view.scale,
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const ratio = scale / view.scale;
      // Apply scale and midpoint translation together before constraining at edges.
      view = constrainView(
        {
          scale,
          x: (point.x + other.x) / 2 - ((old.x + other.x) / 2 - view.x) * ratio,
          y: (point.y + other.y) / 2 - ((old.y + other.y) / 2 - view.y) * ratio,
        },
        fitted,
        bounds(),
      );
    } else if (pointer.moved) {
      view = constrainView(
        { ...view, x: view.x + point.x - old.x, y: view.y + point.y - old.y },
        fitted,
        bounds(),
      );
    }
    pointer.point = point;
    render();
  });
  const releasePointer = (event) => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointers.delete(event.pointerId);
    viewport.dataset.dragging = String(pointers.size > 0);
    if (event.pointerType === 'touch') {
      lastTouchTime = event.timeStamp;
      if (
        event.type === 'pointerup' &&
        !pointer.moved &&
        !multiplePointers &&
        event.timeStamp - pointer.time < 300
      ) {
        event.preventDefault();
        const point = pointer.point;
        if (
          lastTap &&
          event.timeStamp - lastTap.time < 300 &&
          Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) < 30
        ) {
          clearTimeout(tapTimer);
          lastTap = undefined;
          zoom(view.scale > 1 ? 1 : 2, point);
        } else {
          lastTap = { point, time: event.timeStamp };
          tapTimer = setTimeout(() => {
            showControls(dialog.dataset.controlsHidden === 'true');
            // Never leave keyboard focus in controls made invisible by a touch.
            if (dialog.dataset.controlsHidden === 'true')
              viewport.focus({ preventScroll: true });
            lastTap = undefined;
          }, 300);
        }
      }
    }
    if (!pointers.size) multiplePointers = false;
  };
  viewport.addEventListener('pointerup', releasePointer);
  viewport.addEventListener('pointercancel', releasePointer);
  viewport.addEventListener('lostpointercapture', releasePointer);
  const resize = () => {
    resizeFrame = undefined;
    if (!dialog.open) return;
    clearGesture();
    updateCaption();
    fit();
  };
  // Defer layout writes out of the observer delivery cycle to avoid resize loops.
  const scheduleResize = () => {
    if (win?.requestAnimationFrame) {
      if (!resizeFrame) resizeFrame = win.requestAnimationFrame(resize);
    } else resize();
  };
  const observer = new ResizeObserver(scheduleResize);
  observer.observe(viewport);
  observer.observe(caption);
}

if (typeof document !== 'undefined') initImageViewer();
