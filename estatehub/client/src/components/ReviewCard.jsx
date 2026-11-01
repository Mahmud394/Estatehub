import Stars from './Stars.jsx';
import { formatDate } from '../utils/format.js';

// "Demo Client One" -> "Demo C."  (we show only a first name and an initial for privacy)
const shortName = (name = '') => {
  const [first, ...rest] = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

export default function ReviewCard({ review }) {
  return (
    <figure className="flex h-full flex-col rounded border border-gray-200 bg-white p-6">
      <Stars value={review.rating} />
      <blockquote className="mt-3 flex-1 text-gray-700">“{review.body}”</blockquote>
      <figcaption className="mt-4 text-sm">
        <span className="font-semibold">{shortName(review.clientName)}</span>
        {review.brokerName && <span className="text-gray-500"> on {review.brokerName}</span>}
        <span className="block text-xs text-gray-500">{formatDate(review.createdAt)}</span>
        {review.isDemo && (
          <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            Sample content, not a real customer review
          </span>
        )}
      </figcaption>
    </figure>
  );
}
