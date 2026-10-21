import { guestToday } from './guest-dates.js';

// Recheck static HTML after publication, including pages restored from history.
export function refreshGuests(root = document, today = guestToday()) {
  root.querySelectorAll('[data-guest-end]').forEach((entry) => {
    if (entry.dataset.guestEnd < today) entry.remove();
  });

  root.querySelectorAll('[data-guest-list]').forEach((list) => {
    const entries = [...list.querySelectorAll('[data-guest-end]')];
    if (!entries.length) {
      list.remove();
      return;
    }
    const limit = Number(list.dataset.guestLimit) || entries.length;
    entries.forEach((entry, index) => {
      entry.hidden = index >= limit;
    });
  });

  root.querySelectorAll('[data-guest-agenda]').forEach((agenda) => {
    if (agenda.querySelector('[data-guest-end]')) return;
    const contact = agenda.closest('[data-guest-contact]');
    const copy = contact?.querySelector('[data-guest-contact-copy]');
    const alerts = agenda.querySelector('[data-guest-alerts]');
    if (contact && copy && alerts) {
      // Keep the same single alerts link and the existing empty Contact layout.
      alerts.className = 'contact-city-alerts';
      alerts.id = 'proximos-guests';
      copy.append(alerts);
      agenda.remove();
      contact.classList.add('contact-content--without-agenda');
    } else {
      const empty = agenda.querySelector('[data-guest-empty]');
      if (empty) empty.hidden = false;
    }
  });
}

if (
  typeof document !== 'undefined' &&
  document.querySelector('[data-guest-end]')
) {
  let timer;
  const refresh = () => {
    refreshGuests();
    if (!document.querySelector('[data-guest-end]')) clearInterval(timer);
  };
  const start = () => {
    clearInterval(timer);
    timer = setInterval(refresh, 60_000);
    refresh();
  };
  start();
  window.addEventListener('pageshow', start);
  window.addEventListener('pagehide', () => clearInterval(timer));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}
