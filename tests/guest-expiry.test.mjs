import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshGuests } from '../public/scripts/guest-expiry.js';

// Minimal tree double: exercise the production expiry controller and reparenting.
class Element {
  children = [];
  parent = null;
  hidden = false;
  classList = new Set();
  constructor(dataset = {}, children = []) {
    this.dataset = dataset;
    for (const child of children) this.append(child);
  }
  matches(selector) {
    const name = selector
      .slice(6, -1)
      .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    return Object.hasOwn(this.dataset, name);
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  closest(selector) {
    return this.matches(selector) ? this : this.parent?.closest(selector);
  }
  append(child) {
    child.remove();
    child.parent = this;
    this.children.push(child);
  }
  remove() {
    if (this.parent) {
      this.parent.children = this.parent.children.filter(
        (child) => child !== this,
      );
      this.parent = null;
    }
  }
}
const entry = (endDate) => new Element({ guestEnd: endDate });
const list = (children, limit) =>
  new Element({ guestList: '', guestLimit: limit }, children);

test('a stale static page removes past dates and refills the three home slots', () => {
  const dates = [
    '2026-10-17',
    '2026-10-24',
    '2026-11-28',
    '2026-12-01',
    '2027-01-02',
  ];
  const home = list(dates.map(entry), '3');
  const footer = list(dates.map(entry));
  const root = new Element({}, [home, footer]);
  refreshGuests(root, '2026-10-21');
  assert.deepEqual(
    home.children.map((item) => item.dataset.guestEnd),
    dates.slice(1),
  );
  assert.deepEqual(
    home.children.map((item) => item.hidden),
    [false, false, false, true],
  );
  assert.equal(footer.children.length, 4);
  refreshGuests(root, '2026-10-24');
  assert.equal(home.children.length, 4);
  refreshGuests(root, '2026-10-25');
  assert.deepEqual(
    home.children.map((item) => item.hidden),
    [false, false, false],
  );
  refreshGuests(root, '2027-01-03');
  assert.equal(root.children.length, 0);
});

test('expired months disappear and Contact moves its existing alerts link when empty', () => {
  const copy = new Element({ guestContactCopy: '' });
  const alertsLink = new Element();
  const alerts = new Element({ guestAlerts: '' }, [alertsLink]);
  const pastMonth = list([entry('2026-10-17')]);
  const nextMonth = list([entry('2026-11-28')]);
  const agenda = new Element({ guestAgenda: '' }, [
    pastMonth,
    nextMonth,
    alerts,
  ]);
  const contact = new Element({ guestContact: '' }, [copy, agenda]);
  const root = new Element({}, [contact]);
  refreshGuests(root, '2026-10-21');
  assert.equal(pastMonth.parent, null);
  assert.equal(nextMonth.parent, agenda);
  assert.equal(alerts.parent, agenda);
  refreshGuests(root, '2026-11-29');
  assert.equal(agenda.parent, null);
  assert.equal(alerts.parent, copy);
  assert.equal(alerts.children[0], alertsLink);
  assert.equal(alerts.id, 'proximos-guests');
  assert.equal(alerts.className, 'contact-city-alerts');
  assert.equal(contact.classList.has('contact-content--without-agenda'), true);
  refreshGuests(root, '2026-11-30');
  assert.equal(copy.children.length, 1);
});

test('the standalone agenda keeps its empty message and the About CTA expires', () => {
  const empty = new Element({ guestEmpty: '' });
  empty.hidden = true;
  const agenda = new Element({ guestAgenda: '' }, [
    list([entry('2026-10-17')]),
    empty,
  ]);
  const cta = entry('2026-10-17');
  const root = new Element({}, [agenda, cta]);
  refreshGuests(root, '2026-10-18');
  assert.equal(empty.hidden, false);
  assert.equal(agenda.parent, root);
  assert.equal(cta.parent, null);
});
