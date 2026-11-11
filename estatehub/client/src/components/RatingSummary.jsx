import { Star } from 'lucide-react';
import Stars from './Stars.jsx';

// Average rating + how many reviews gave 5, 4, 3, 2 and 1 stars. All numbers come from the API.
export default function RatingSummary({ summary }) {
  if (!summary || summary.count === 0) {
    return <p className="text-gray-500">No reviews yet. Be the first to share your experience.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-8">
      <div>
        <p className="font-serif text-6xl leading-none text-forest">{summary.average.toFixed(1)}</p>
        <div className="mt-2"><Stars value={summary.average} size={20} /></div>
        <p className="mt-1 text-sm text-gray-600">{summary.count} review{summary.count === 1 ? '' : 's'}</p>
      </div>
      <ul className="min-w-[220px] flex-1 space-y-1.5" aria-label="Rating breakdown">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = summary.breakdown[n] || 0;
          const pct = Math.round((count / summary.count) * 100);
          return (
            <li key={n} className="flex items-center gap-2 text-sm">
              <span className="flex w-8 items-center gap-0.5 text-gray-700">{n}<Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" /></span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-8 text-right text-gray-600">{count}</span>
              <span className="sr-only">{count} review{count === 1 ? '' : 's'} with {n} star{n === 1 ? '' : 's'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
