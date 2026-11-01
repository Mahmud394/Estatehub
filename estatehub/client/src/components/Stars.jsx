import { Star } from 'lucide-react';

export default function Stars({ value, size = 16 }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} width={size} height={size} aria-hidden="true"
          className={n <= rounded ? 'fill-gold text-gold' : 'text-gray-300'} />
      ))}
    </span>
  );
}
