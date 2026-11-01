// Profile picture, or the person's initials when there is no photo.
// Initials are drawn locally, so no name is ever sent to a third-party service.
const initials = (name = '') =>
  name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

export default function Avatar({ name, url, className = 'h-10 w-10 text-sm', tone = 'forest' }) {
  const colors = tone === 'gold' ? 'bg-gold text-midnight' : 'bg-forest text-ivory';
  if (url) return <img src={url} alt="" draggable="false" className={`rounded-full object-cover ${className}`} />;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-semibold ${colors} ${className}`}>
      {initials(name)}
    </span>
  );
}
