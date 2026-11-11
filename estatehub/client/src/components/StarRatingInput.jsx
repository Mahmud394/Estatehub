import { useState } from 'react';
import { Star } from 'lucide-react';

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Accessible star picker built from real radio buttons: works with the mouse, touch and the
// keyboard (Tab to the group, arrow keys to change), and screen readers announce "3 stars, Good".
export default function StarRatingInput({ value, onChange, error, name = 'rating' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">Your rating</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <Star
              aria-hidden="true"
              className={`h-8 w-8 rounded transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${
                n <= shown ? 'fill-gold text-gold' : 'text-gray-300'
              }`}
            />
            <span className="sr-only">{n} star{n > 1 ? 's' : ''}, {LABELS[n - 1]}</span>
          </label>
        ))}
        <span className="ml-2 text-sm text-gray-600" aria-hidden="true">{shown ? LABELS[shown - 1] : 'Select a rating'}</span>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </fieldset>
  );
}
