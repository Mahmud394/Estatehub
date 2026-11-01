import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin } from 'lucide-react';
import Stars from './Stars.jsx';
import Avatar from './Avatar.jsx';

export default function BrokerCard({ broker: b }) {
  return (
    <article className="flex h-full flex-col rounded border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg">
      <div className="flex items-center gap-4">
        <Avatar name={b.name} url={b.avatarUrl} className="h-16 w-16 text-xl" />
        <div className="min-w-0">
          <h3 className="truncate font-sans text-base font-semibold">{b.name}</h3>
          {b.companyName && <p className="truncate text-sm text-gray-600">{b.companyName}</p>}
          {b.verified && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-forest">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified broker
            </p>
          )}
        </div>
      </div>

      {b.serviceAreas.length > 0 && (
        <p className="mt-4 flex items-start gap-1.5 text-sm text-gray-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
          {b.serviceAreas.slice(0, 4).join(', ')}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm">
        {b.averageRating !== null ? (
          <>
            <Stars value={b.averageRating} size={14} />
            <span className="text-gray-600">{b.averageRating} ({b.reviewCount})</span>
          </>
        ) : (
          <span className="text-gray-500">No reviews yet</span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-sm text-gray-600">{b.activeListings} active listing{b.activeListings === 1 ? '' : 's'}</span>
        <Link to={`/brokers/${b.id}`} className="text-sm font-semibold text-forest hover:text-gold">
          View Profile
        </Link>
      </div>
    </article>
  );
}
