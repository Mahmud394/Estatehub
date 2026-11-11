// Formats a BDT price the way Bangladeshis read it: Crore / Lakh.
export function formatPrice(amount, purpose) {
  const n = Number(amount);
  let text;
  if (n >= 10000000) text = `৳${trim(n / 10000000)} Crore`;
  else if (n >= 100000) text = `৳${trim(n / 100000)} Lakh`;
  else text = `৳${n.toLocaleString('en-US')}`;
  return purpose === 'rent' ? `${text}/mo` : text;
}

const trim = (x) => Number(x.toFixed(2)).toString();

export const formatSize = (size) => `${Number(size).toLocaleString('en-US')} sqft`;

export const CATEGORY_LABELS = {
  land: 'Land',
  apartment: 'Apartment',
  house: 'House',
  commercial: 'Commercial',
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// "just now", "5 min ago", "3 h ago", "2 d ago", then a plain date
export function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
  return formatDate(iso);
}
