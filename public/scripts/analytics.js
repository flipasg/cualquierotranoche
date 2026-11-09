export const CONSENT_KEY = 'cualquierotranoche.analytics.v1';
export const CONSENT_DURATION = 180 * 24 * 60 * 60 * 1000;
const deniedConsent = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

export function parseConsent(raw, measurementId, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (
      value?.version === 1 &&
      value.measurementId === measurementId &&
      ['accepted', 'rejected'].includes(value.choice) &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > now &&
      value.expiresAt <= now + CONSENT_DURATION
    )
      return value;
  } catch {
    // Missing, malformed or expired choices never imply permission.
  }
  return null;
}

export function clearAnalyticsCookies(doc, hostname) {
  const names = doc.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0]);
  for (const name of names) {
    if (!/^_ga(?:_|$)/.test(name)) continue;
    const expired = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    doc.cookie = expired;
    doc.cookie = `${expired}; Domain=${hostname}`;
    doc.cookie = `${expired}; Domain=.${hostname}`;
  }
}

function referrerOrigin(referrer) {
  try {
    const url = new URL(referrer);
    return ['http:', 'https:'].includes(url.protocol) ? `${url.origin}/` : '';
  } catch {
    return '';
  }
}

export function createAnalyticsClient(win, doc, measurementId) {
  const disabledKey = `ga-disable-${measurementId}`;
  let configured = false;
  let script;
  win[disabledKey] = true;

  const command = function () {
    win.dataLayer.push(arguments);
  };

  return {
    enable(expiresAt) {
      win[disabledKey] = false;
      if (!configured) {
        win.dataLayer = win.dataLayer || [];
        win.gtag = command;
        command('consent', 'default', { ...deniedConsent });
        command('consent', 'update', { analytics_storage: 'granted' });
        command('js', new Date());
        command('config', measurementId, {
          // The document is static: exactly one page view on initialization.
          send_page_view: true,
          page_location: `${win.location.origin}${win.location.pathname}`,
          page_referrer: referrerOrigin(doc.referrer),
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          cookie_domain: win.location.hostname,
          cookie_path: '/',
          cookie_flags: 'SameSite=Lax;Secure',
          cookie_expires: Math.max(
            1,
            Math.floor((expiresAt - Date.now()) / 1000),
          ),
          cookie_update: false,
        });
        configured = true;
      } else {
        command('consent', 'update', { analytics_storage: 'granted' });
      }
      if (!script) {
        script = doc.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        script.referrerPolicy = 'strict-origin';
        script.onerror = () => {
          // An extension or network failure must not interfere with the site.
          script?.remove();
          script = undefined;
        };
        doc.head.append(script);
      }
    },
    disable() {
      // Disable transmission before updating consent, including a pending tag load.
      win[disabledKey] = true;
      if (configured) command('consent', 'update', { ...deniedConsent });
      clearAnalyticsCookies(doc, win.location.hostname);
    },
  };
}

const controllers = new WeakMap();

export function initAnalytics(root, win = window) {
  if (controllers.has(root)) return controllers.get(root);
  const { measurementId, siteOrigin } = root.dataset;
  // Never collect local development, preview deployments or other domains.
  if (
    !/^G-[A-Z0-9]{10}$/.test(measurementId ?? '') ||
    win.location.origin !== siteOrigin
  )
    return;

  const doc = root.ownerDocument;
  const panel = root.querySelector('[data-analytics-panel]');
  const settings = root.querySelector('[data-analytics-settings]');
  const accept = root.querySelector('[data-analytics-accept]');
  const reject = root.querySelector('[data-analytics-reject]');
  const controls = root.querySelector('[data-analytics-controls]');
  const status = root.querySelector('[data-analytics-status]');
  if (!panel || !settings || !accept || !reject || !controls || !status) return;

  const client = createAnalyticsClient(win, doc, measurementId);
  let timer;
  let returnFocus;
  const readChoice = (fallback = null) => {
    try {
      return parseConsent(win.localStorage.getItem(CONSENT_KEY), measurementId);
    } catch {
      // Consent still works for this page when browser storage is unavailable.
      return parseConsent(JSON.stringify(fallback), measurementId);
    }
  };
  let decision = readChoice();

  function showPanel(focus = false) {
    returnFocus = doc.activeElement;
    panel.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
    if (focus) panel.querySelector('h2')?.focus({ preventScroll: true });
  }

  function hidePanel() {
    const restore = panel.contains(doc.activeElement);
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    if (restore) {
      const target =
        returnFocus && returnFocus !== doc.body ? returnFocus : settings;
      target.focus({ preventScroll: true });
    }
  }

  function applyChoice(value) {
    decision = value;
    win.clearTimeout(timer);
    if (decision?.choice === 'accepted') client.enable(decision.expiresAt);
    else client.disable();
    status.textContent = decision
      ? decision.choice === 'accepted'
        ? 'Has aceptado estas cookies.'
        : 'Has rechazado estas cookies.'
      : '';
    if (decision) {
      hidePanel();
      // setTimeout cannot represent the entire 180-day retention period.
      timer = win.setTimeout(
        checkExpiry,
        Math.min(decision.expiresAt - Date.now(), 2147483647),
      );
    } else showPanel();
  }

  function checkExpiry() {
    if (!decision) return;
    if (decision.expiresAt <= Date.now()) applyChoice(null);
    else {
      win.clearTimeout(timer);
      timer = win.setTimeout(
        checkExpiry,
        Math.min(decision.expiresAt - Date.now(), 2147483647),
      );
    }
  }

  function choose(choice) {
    const value = {
      version: 1,
      measurementId,
      choice,
      expiresAt: Date.now() + CONSENT_DURATION,
    };
    try {
      win.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch {
      // Apply the choice now; ask again on the next page if it cannot be saved.
    }
    applyChoice(value);
  }

  const onAccept = () => choose('accepted');
  const onReject = () => choose('rejected');
  const onSettings = () => showPanel(true);
  const onKey = (event) => {
    if (
      event.key === 'Escape' &&
      !panel.hidden &&
      panel.contains(doc.activeElement)
    )
      hidePanel();
  };
  const onStorage = (event) => {
    if (event.key === CONSENT_KEY || event.key === null)
      applyChoice(readChoice());
  };
  // A page restored from the back/forward cache may have missed a revocation.
  const refreshChoice = () => applyChoice(readChoice(decision));
  const onVisibility = () => {
    if (doc.visibilityState === 'visible') refreshChoice();
  };

  accept.addEventListener('click', onAccept);
  reject.addEventListener('click', onReject);
  settings.addEventListener('click', onSettings);
  panel.addEventListener('keydown', onKey);
  win.addEventListener('storage', onStorage);
  win.addEventListener('pageshow', refreshChoice);
  doc.addEventListener('visibilitychange', onVisibility);
  controls.hidden = false;
  applyChoice(decision);

  const dispose = () => {
    win.clearTimeout(timer);
    accept.removeEventListener('click', onAccept);
    reject.removeEventListener('click', onReject);
    settings.removeEventListener('click', onSettings);
    panel.removeEventListener('keydown', onKey);
    win.removeEventListener('storage', onStorage);
    win.removeEventListener('pageshow', refreshChoice);
    doc.removeEventListener('visibilitychange', onVisibility);
    controllers.delete(root);
  };
  controllers.set(root, dispose);
  return dispose;
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-analytics]'))
    initAnalytics(root);
}
