import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';
import FormField from '../../components/FormField.jsx';
import { LoadingSpinner, ErrorMessage } from '../../components/StateViews.jsx';

const EMPTY = {
  title: '', description: '', category: 'apartment', purpose: 'sale', price: '', size: '',
  bedrooms: '', bathrooms: '', city: '', area: '', addressLine: '', availabilityStatus: 'available',
};

// One form for both "Add property" and "Edit property" (edit when :id is in the URL).
export default function PropertyForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api(`/properties/${id}`)
      .then((p) => {
        setForm({
          title: p.title, description: p.description, category: p.category, purpose: p.purpose,
          price: p.price, size: p.size, bedrooms: p.bedrooms ?? '', bathrooms: p.bathrooms ?? '',
          city: p.city, area: p.area, addressLine: p.addressLine || '', availabilityStatus: p.availabilityStatus,
        });
        setImages(p.images);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isLand = form.category === 'land';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({}); setNotice('');
    const body = { ...form };
    if (isLand) { body.bedrooms = ''; body.bathrooms = ''; }
    if (!editing) delete body.availabilityStatus;
    try {
      const saved = await api(editing ? `/properties/${id}` : '/properties', { method: editing ? 'PATCH' : 'POST', body });
      if (editing) {
        setNotice('Saved. If the listing was approved, edits may send it back for re-approval.');
      } else {
        // Go to the edit page so photos can be added right away
        navigate(`/broker/properties/${saved.id}/edit`, { replace: true, state: { created: true } });
      }
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const data = new FormData();
    [...files].forEach((f) => data.append('images', f));
    setError(''); setNotice('');
    try {
      setImages(await api(`/properties/${id}/images`, { method: 'POST', body: data }));
      setNotice('Photos uploaded.');
    } catch (err) { setError(err.message); }
    e.target.value = '';
  };

  const makePrimary = async (imgId) => {
    try { setImages(await api(`/properties/${id}/images/${imgId}/primary`, { method: 'PATCH' })); }
    catch (err) { setError(err.message); }
  };
  const removeImage = async (imgId) => {
    try { setImages(await api(`/properties/${id}/images/${imgId}`, { method: 'DELETE' })); }
    catch (err) { setError(err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/broker" className="text-sm text-forest underline">← Back to dashboard</Link>
      <h1 className="mt-3 text-4xl">{editing ? 'Edit property' : 'Add a property'}</h1>
      <p className="mt-1 text-gray-600">New and substantially edited listings are reviewed by an admin before they appear publicly.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {error && <ErrorMessage message={error} />}
        {notice && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

        <FormField id="title" label="Title" value={form.title} error={fieldErrors.title} onChange={set('title')} />
        <FormField id="description" as="textarea" rows={5} label="Description" value={form.description} error={fieldErrors.description} onChange={set('description')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="category" as="select" label="Property type" value={form.category} error={fieldErrors.category} onChange={set('category')}>
            <option value="apartment">Apartment</option><option value="house">House</option>
            <option value="land">Land</option><option value="commercial">Commercial</option>
          </FormField>
          <FormField id="purpose" as="select" label="Listing purpose" value={form.purpose} error={fieldErrors.purpose} onChange={set('purpose')}>
            <option value="sale">For sale</option><option value="rent">For rent (monthly)</option>
          </FormField>
          <FormField id="price" type="number" min="0" label="Price (৳ BDT)" value={form.price} error={fieldErrors.price} onChange={set('price')} />
          <FormField id="size" type="number" min="0" label="Size (sqft)" value={form.size} error={fieldErrors.size} onChange={set('size')} />
          {!isLand && (
            <>
              <FormField id="bedrooms" type="number" min="0" label="Bedrooms" value={form.bedrooms} error={fieldErrors.bedrooms} onChange={set('bedrooms')} />
              <FormField id="bathrooms" type="number" min="0" label="Bathrooms" value={form.bathrooms} error={fieldErrors.bathrooms} onChange={set('bathrooms')} />
            </>
          )}
          <FormField id="city" label="City" value={form.city} error={fieldErrors.city} onChange={set('city')} />
          <FormField id="area" label="Area (public)" value={form.area} error={fieldErrors.area} onChange={set('area')} />
        </div>

        <FormField id="addressLine" label="Exact address (private)" hint="Only you and admins can see this. It is never shown publicly."
          value={form.addressLine} error={fieldErrors.addressLine} onChange={set('addressLine')} />

        {editing && (
          <FormField id="availabilityStatus" as="select" label="Availability" value={form.availabilityStatus} error={fieldErrors.availabilityStatus} onChange={set('availabilityStatus')}>
            <option value="available">Available</option><option value="sold">Sold</option>
            <option value="rented">Rented</option><option value="unavailable">Unavailable</option>
          </FormField>
        )}

        <button disabled={busy} className="rounded bg-forest px-6 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create listing'}
        </button>
      </form>

      {editing && (
        <section className="mt-12" aria-labelledby="photos">
          <h2 id="photos" className="text-2xl">Photos</h2>
          <p className="text-sm text-gray-600">JPG, PNG or WebP, up to 5 MB each (max 12 per listing).</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} aria-label="Upload photos"
            className="mt-3 block text-sm file:mr-3 file:rounded file:border-0 file:bg-forest file:px-4 file:py-2 file:text-white" />
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded border border-gray-200 bg-white">
                <img src={img.url} alt="" className="aspect-[3/2] w-full object-cover" />
                <div className="flex items-center justify-between p-2 text-xs">
                  {img.isPrimary ? (
                    <span className="flex items-center gap-1 font-semibold text-forest"><Star className="h-4 w-4" aria-hidden="true" /> Main photo</span>
                  ) : (
                    <button onClick={() => makePrimary(img.id)} className="text-forest underline">Make main</button>
                  )}
                  <button onClick={() => removeImage(img.id)} aria-label="Remove photo" className="text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          {images.length === 0 && <p className="mt-3 text-sm text-gray-500">No photos yet.</p>}
        </section>
      )}
    </div>
  );
}
