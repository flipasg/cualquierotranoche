const dateFormat = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Calendar dates in the CMS remain visible throughout their final day in Spain.
export function guestToday(now = new Date()) {
  const parts = dateFormat.formatToParts(now);
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-');
}
