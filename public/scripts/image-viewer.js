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
  const message = dialog.querySelector('[data-viewer-message]');
  const zoomLabel = dialog.querySelector('[data-viewer-zoom]');
  const zoomIn = dialog.querySelector('[data-viewer-in]');
  const zoomOut = dialog.querySelector('[data-viewer-out]');
  const reset = dialog.querySelector('[data-viewer-reset]');
  const close = dialog.querySelector('[data-viewer-close]');
  let view = { scale: 1, x: 0, y: 0 };
  let fitted = { width: 0, height: 0 };
  let ready = false;
  let opener;
  let previousOverflow;
  const pointers = new Map();
  const bounds = () => ({
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  });

  const render = () => {
    image.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    zoomLabel.textContent = `${Math.round(view.scale * 100)} %`;
    zoomIn.disabled = !ready || view.scale >= MAX_ZOOM;
    zoomOut.disabled = !ready || view.scale <= MIN_ZOOM;
    reset.disabled = !ready || view.scale === MIN_ZOOM;
    viewport.dataset.zoomed = String(ready && view.scale > MIN_ZOOM);
  };

  const fit = () => {
    if (!dialog.open || !ready) return;
    fitted = fitImage(
      { width: image.naturalWidth, height: image.naturalHeight },
      bounds(),
    );
    image.style.width = `${fitted.width}px`;
    image.style.height = `${fitted.height}px`;
    view = { scale: 1, x: 0, y: 0 };
    render();
  };

  const zoom = (scale, point = { x: 0, y: 0 }) => {
    if (!ready) return;
    view = zoomAt(view, scale, point, fitted, bounds());
    render();
  };

  const pan = (x, y) => {
    view = constrainView(
      { ...view, x: view.x + x, y: view.y + y },
      fitted,
      bounds(),
    );
    render();
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
    if (ready) fit();
    else {
      message.textContent =
        'No se ha podido cargar la imagen. Cierra el visor e inténtalo de nuevo.';
      render();
    }
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
    ready = false;
    view = { scale: 1, x: 0, y: 0 };
    image.hidden = true;
    caption.textContent = trigger.querySelector('img').alt;
    image.alt = caption.textContent;
    message.textContent = 'Cargando imagen…';
    message.hidden = false;
    viewport.setAttribute('aria-busy', 'true');
    previousOverflow = root.documentElement.style.overflow;
    root.documentElement.style.overflow = 'hidden';
    render();
    dialog.showModal();
    image.src = trigger.href;
    if (image.complete) loaded();
  });

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    root.documentElement.style.overflow = previousOverflow;
    pointers.clear();
    viewport.dataset.dragging = 'false';
    ready = false;
    image.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
  zoomIn.addEventListener('click', () => zoom(view.scale + 0.5));
  zoomOut.addEventListener('click', () => zoom(view.scale - 0.5));
  reset.addEventListener('click', fit);

  dialog.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || !ready) return;
    switch (event.key) {
      case '+':
      case '=':
        zoom(view.scale + 0.5);
        break;
      case '-':
        zoom(view.scale - 0.5);
        break;
      case '0':
        fit();
        break;
      case 'ArrowLeft':
        pan(60, 0);
        break;
      case 'ArrowRight':
        pan(-60, 0);
        break;
      case 'ArrowUp':
        pan(0, 60);
        break;
      case 'ArrowDown':
        pan(0, -60);
        break;
      default:
        return;
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
      );
    },
    { passive: false },
  );
  viewport.addEventListener('dblclick', (event) => {
    event.preventDefault();
    zoom(view.scale > 1 ? 1 : 2, pointFromEvent(event));
  });
  viewport.addEventListener('pointerdown', (event) => {
    if (!ready || event.button !== 0) return;
    pointers.set(event.pointerId, pointFromEvent(event));
    viewport.setPointerCapture(event.pointerId);
    viewport.dataset.dragging = 'true';
  });
  viewport.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const point = pointFromEvent(event);
    const other = [...pointers.entries()].find(
      ([id]) => id !== event.pointerId,
    )?.[1];
    if (other) {
      const oldDistance = Math.hypot(
        previous.x - other.x,
        previous.y - other.y,
      );
      const newDistance = Math.hypot(point.x - other.x, point.y - other.y);
      const center = {
        x: (previous.x + other.x) / 2,
        y: (previous.y + other.y) / 2,
      };
      if (oldDistance > 0)
        zoom((view.scale * newDistance) / oldDistance, center);
      pan((point.x - previous.x) / 2, (point.y - previous.y) / 2);
    } else {
      pan(point.x - previous.x, point.y - previous.y);
    }
    pointers.set(event.pointerId, point);
  });
  const releasePointer = (event) => {
    pointers.delete(event.pointerId);
    viewport.dataset.dragging = String(pointers.size > 0);
  };
  viewport.addEventListener('pointerup', releasePointer);
  viewport.addEventListener('pointercancel', releasePointer);
  viewport.addEventListener('lostpointercapture', releasePointer);
  // Refit when the viewport changes (including rotation and browser zoom).
  new ResizeObserver(fit).observe(viewport);
}

if (typeof document !== 'undefined') initImageViewer();
