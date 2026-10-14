import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BedDouble, Bath, Ruler, MapPin, Building } from 'lucide-react';
import { api } from '../services/api.js';
import PropertyCard from '../components/PropertyCard.jsx';
import { LoadingSpinner, ErrorMessage } from '../components/StateViews.jsx';
import { formatPrice, formatSize, formatDate, CATEGORY_LABELS } from '../utils/format.js';
import { getPropertyGallery } from '../utils/propertyImages.js';
export default function PropertyDetails() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true });
  const [active, setActive] = useState(0);

  useEffect(() => {
    setState({ loading: true });
    setActive(0);
    api(`/properties/${id}`)
      .then((data) => setState({ data }))
      .catch((err) => setState({ error: err.message, status: err.status }));
  }, [id]);

  if (state.loading) return <LoadingSpinner />;
  if (state.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorMessage message={state.status === 404 ? 'This property is not available.' : state.error} />
        <Link to="/properties" className="mt-4 inline-block text-forest underline">Back to all properties</Link>
      </div>
    );
  }

  const p = state.data;
  const images = getPropertyGallery(p);
  const notPublic = p.approvalStatus !== 'approved';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {notPublic && (
        <p role="status" className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-900">
          Only you can see this listing. Status: <strong>{p.approvalStatus}</strong>.
          {p.rejectionReason && ` Reason: ${p.rejectionReason}`}
        </p>
      )}
      <Link to="/properties" className="text-sm text-forest underline">← All properties</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="aspect-[3/2] overflow-hidden rounded bg-gray-100">
            <img src={images[active].url} alt={`${p.title}, photo ${active + 1}`} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Photo gallery">
              {images.map((img, i) => (
                <li key={img.id}>
                  <button onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === active}
                    className={`h-16 w-24 overflow-hidden rounded border-2 ${i === active ? 'border-gold' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded bg-midnight px-2.5 py-1 text-gold">{p.purpose === 'sale' ? 'For Sale' : 'For Rent'}</span>
            <span className="rounded bg-forest/10 px-2.5 py-1 text-forest">{CATEGORY_LABELS[p.category]}</span>
            {p.isDemo && <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-600">Demo listing</span>}
          </div>
          <h1 className="mt-3 text-4xl">{p.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-gray-600"><MapPin className="h-4 w-4" aria-hidden="true" />{p.area}, {p.city}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded border border-gray-200 bg-white p-4 sm:grid-cols-4">
            <div><dt className="flex items-center gap-1 text-xs text-gray-500"><Ruler className="h-4 w-4" aria-hidden="true" />Size</dt><dd className="font-semibold">{formatSize(p.size)}</dd></div>
            {p.bedrooms != null && <div><dt className="flex items-center gap-1 text-xs text-gray-500"><BedDouble className="h-4 w-4" aria-hidden="true" />Bedrooms</dt><dd className="font-semibold">{p.bedrooms}</dd></div>}
            {p.bathrooms != null && <div><dt className="flex items-center gap-1 text-xs text-gray-500"><Bath className="h-4 w-4" aria-hidden="true" />Bathrooms</dt><dd className="font-semibold">{p.bathrooms}</dd></div>}
            <div><dt className="flex items-center gap-1 text-xs text-gray-500"><Building className="h-4 w-4" aria-hidden="true" />Listed</dt><dd className="font-semibold">{formatDate(p.createdAt)}</dd></div>
          </dl>

          <h2 className="mt-8 text-2xl">About this property</h2>
          <p className="mt-2 whitespace-pre-line text-gray-700">{p.description}</p>
          {p.addressLine && <p className="mt-4 text-sm text-gray-600"><strong>Exact address (visible to you only):</strong> {p.addressLine}</p>}
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded border border-gray-200 bg-white p-5">
            <p className="font-serif text-3xl text-forest">{formatPrice(p.price, p.purpose)}</p>
            <p className="mt-1 text-xs text-gray-500">Status: {p.availabilityStatus}</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">Listed by</p>
            <div className="mt-3 flex items-center gap-3">
              <img src={p.broker.avatarUrl || `https://ui-avatars.com/api/?background=174C3C&color=F7F5F0&name=${encodeURIComponent(p.broker.name)}`}
                alt="" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="font-semibold">{p.broker.name}</p>
                {p.broker.companyName && <p className="text-sm text-gray-600">{p.broker.companyName}</p>}
                {p.broker.verified && <p className="text-xs font-medium text-forest">Verified broker</p>}
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">Comments and messaging with the broker arrive in Phase 4.</p>
          </div>
        </aside>
      </div>

      {p.similar.length > 0 && (
        <section className="mt-14" aria-labelledby="similar">
          <h2 id="similar" className="text-3xl">Similar properties</h2>
          <p className="text-sm text-gray-600">Same type and purpose, with a similar price (within 40%).</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {p.similar.map((s) => <PropertyCard key={s.id} property={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}
