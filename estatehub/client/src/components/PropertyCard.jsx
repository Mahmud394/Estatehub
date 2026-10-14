import { Link } from 'react-router-dom';
import { BedDouble, Bath, Ruler, MapPin } from 'lucide-react';
import { formatPrice, formatSize, CATEGORY_LABELS } from '../utils/format.js';
import { getPropertyCardImage } from '../utils/propertyImages.js';


export default function PropertyCard({ property: p }) {
  return (
    <article className="group overflow-hidden rounded border border-gray-200 bg-white transition-shadow hover:shadow-xl">
      <Link to={`/properties/${p.id}`} className="block">
        <div className="relative aspect-[3/2] overflow-hidden bg-gray-100">
          <img
            src={getPropertyCardImage(p)}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded bg-midnight/85 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
            {p.purpose === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
          
        </div>
        <div className="p-4">
          <p className="font-serif text-2xl text-forest">{formatPrice(p.price, p.purpose)}</p>
          <h3 className="mt-1 line-clamp-1 font-sans text-base font-semibold">{p.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {p.area}, {p.city}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            <li className="flex items-center gap-1"><Ruler className="h-4 w-4" aria-hidden="true" />{formatSize(p.size)}</li>
            {p.bedrooms != null && <li className="flex items-center gap-1"><BedDouble className="h-4 w-4" aria-hidden="true" />{p.bedrooms} bed</li>}
            {p.bathrooms != null && <li className="flex items-center gap-1"><Bath className="h-4 w-4" aria-hidden="true" />{p.bathrooms} bath</li>}
            <li className="text-gray-500">{CATEGORY_LABELS[p.category]}</li>
          </ul>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src={p.broker.avatarUrl || `https://ui-avatars.com/api/?background=174C3C&color=F7F5F0&name=${encodeURIComponent(p.broker.name)}`}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-sm text-gray-700">{p.broker.name}</span>
        </div>
        <Link to={`/properties/${p.id}`} className="text-sm font-semibold text-forest hover:text-gold">
          View Details
        </Link>
      </div>
    </article>
  );
}
