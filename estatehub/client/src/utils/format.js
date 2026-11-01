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
