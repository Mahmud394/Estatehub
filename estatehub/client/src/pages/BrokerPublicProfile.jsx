import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, MapPin } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import Avatar from '../components/Avatar.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import ReviewsSection from '../components/ReviewsSection.jsx';
import ContactBrokerForm from '../components/ContactBrokerForm.jsx';
import Stars from '../components/Stars.jsx';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/StateViews.jsx';

export default function BrokerPublicProfile() {
  const { id } = useParams();
  const { data: b, error, loading, reload } = useApi(`/brokers/${id}`);

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorMessage message={error} onRetry={reload} />
        <Link to="/brokers" className="mt-4 inline-block text-forest underline">Back to all brokers</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/brokers" className="text-sm text-forest underline">← All brokers</Link>

      <header className="mt-4 flex flex-wrap items-center gap-6 border-b border-gray-200 pb-8">
        <Avatar name={b.name} url={b.avatarUrl} className="h-28 w-28 text-4xl" />
        <div>
          <h1 className="text-4xl">{b.name}</h1>
          {b.companyName && <p className="text-lg text-gray-600">{b.companyName}</p>}
          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-forest">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified broker
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {b.averageRating !== null
              ? (<><Stars value={b.averageRating} /><span className="text-gray-600">{b.averageRating} from {b.reviewCount} review{b.reviewCount === 1 ? '' : 's'}</span></>)
              : <span className="text-gray-500">No reviews yet</span>}
          </div>
          {b.serviceAreas.length > 0 && (
            <p className="mt-2 flex items-center gap-1 text-sm text-gray-700">
              <MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" /> {b.serviceAreas.join(', ')}
            </p>
          )}
        </div>
      </header>

      {b.bio && <p className="mt-6 max-w-3xl whitespace-pre-line text-gray-700">{b.bio}</p>}

      <section className="mt-10" aria-labelledby="listings">
        <h2 id="listings" className="text-3xl">Active listings ({b.activeListings})</h2>
        {b.listings.length === 0
          ? <EmptyState title="No active listings" message="This broker has no approved, available listings right now." />
          : <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{b.listings.map((p) => <PropertyCard key={p.id} property={p} />)}</div>}
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ReviewsSection brokerId={b.id} brokerName={b.name} />
        <aside className="h-fit lg:sticky lg:top-24">
          <ContactBrokerForm brokerId={b.id} brokerName={b.name} />
        </aside>
      </div>
    </div>
  );
}
