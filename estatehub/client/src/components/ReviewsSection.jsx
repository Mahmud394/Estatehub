import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import RatingSummary from './RatingSummary.jsx';
import ReviewCard from './ReviewCard.jsx';
import StarRatingInput from './StarRatingInput.jsx';
import Stars from './Stars.jsx';
import FormField from './FormField.jsx';
import ConfirmationDialog from './ConfirmationDialog.jsx';
import { ErrorMessage } from './StateViews.jsx';

const PAGE_SIZE = 6;

// Ratings and reviews of one broker: summary, public list, and (for eligible clients) the form.
export default function ReviewsSection({ brokerId, brokerName }) {
  const { user } = useAuth();
  const location = useLocation();
  const isClient = user?.role === 'client';

  const [list, setList] = useState(null);
  const [listError, setListError] = useState('');
  const [mine, setMine] = useState(null); // { eligible, review } for the logged-in client

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ rating: 0, body: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (page = 1, append = false) => {
    try {
      const d = await api(`/brokers/${brokerId}/reviews?page=${page}&limit=${PAGE_SIZE}`);
      setList((prev) => (append && prev ? { ...d, items: [...prev.items, ...d.items] } : d));
      setListError('');
    } catch (err) { setListError(err.message); }
  }, [brokerId]);

  const loadMine = useCallback(async () => {
    if (!isClient) { setMine(null); return; }
    try { setMine(await api(`/reviews/eligibility/${brokerId}`)); } catch { setMine(null); }
  }, [brokerId, isClient]);

  useEffect(() => { loadList(1); }, [loadList]);
  useEffect(() => { loadMine(); }, [loadMine]);

  const startEdit = () => {
    setForm({ rating: mine.review.rating, body: mine.review.body });
    setFieldErrors({}); setFormError(''); setNotice('');
    setEditing(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({}); setFormError(''); setNotice('');
    if (!form.rating) { setFieldErrors({ rating: 'Choose a rating from 1 to 5.' }); return; }
    setBusy(true);
    try {
      if (editing) await api(`/reviews/${mine.review.id}`, { method: 'PATCH', body: { rating: form.rating, body: form.body } });
      else await api('/reviews', { method: 'POST', body: { brokerId, rating: form.rating, body: form.body } });
      setNotice(editing ? 'Your review was updated.' : 'Thank you, your review was published.');
      setEditing(false);
      setForm({ rating: 0, body: '' });
      await Promise.all([loadList(1), loadMine()]);
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(err.errors || {});
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await api(`/reviews/${mine.review.id}`, { method: 'DELETE' });
      setNotice('Your review was deleted.');
      setForm({ rating: 0, body: '' });
      await Promise.all([loadList(1), loadMine()]);
    } catch (err) { setFormError(err.message); }
  };

  const showForm = isClient && mine && ((mine.eligible && !mine.review) || editing);
  const page = list ? list.pagination.page : 1;

  return (
    <section aria-labelledby="reviews-title" id="reviews">
      <h2 id="reviews-title" className="text-3xl">Ratings and reviews</h2>

      {listError && <div className="mt-4"><ErrorMessage message={listError} onRetry={() => loadList(1)} /></div>}
      {list && <div className="mt-5 rounded border border-gray-200 bg-white p-6"><RatingSummary summary={list.summary} /></div>}

      {/* ── write / manage your own review ── */}
      <div className="mt-6" aria-live="polite">
        {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

        {!user && (
          <p className="rounded border border-gray-200 bg-white p-4 text-sm">
            <Link to="/login" state={{ from: location.pathname }} className="font-semibold text-forest underline">Log in</Link> as a client to rate {brokerName}.
          </p>
        )}
        {user && !isClient && (
          <p className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">Reviews can only be written by client accounts.</p>
        )}
        {isClient && mine && !mine.review && !mine.eligible && (
          <p className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
            You can review {brokerName} after you have sent them a message. Use the contact form on this page, then come back to leave your rating.
          </p>
        )}

        {isClient && mine?.review && !editing && (
          <div className="rounded border border-forest/30 bg-forest/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">Your review</p>
              <div className="flex gap-2">
                {mine.review.status !== 'hidden' && (
                  <button onClick={startEdit} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:border-forest">
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </button>
                )}
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:border-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
            <div className="mt-2"><Stars value={mine.review.rating} /></div>
            <p className="mt-2 whitespace-pre-line text-gray-700">{mine.review.body}</p>
            {mine.review.status === 'hidden' && (
              <p className="mt-3 text-sm text-amber-800">A moderator hid this review, so it is not shown publicly and cannot be edited.</p>
            )}
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} noValidate className="space-y-4 rounded border border-gray-200 bg-white p-5" aria-label={editing ? 'Edit your review' : 'Write a review'}>
            <h3 className="font-sans text-lg font-semibold">{editing ? 'Edit your review' : `Rate ${brokerName}`}</h3>
            {formError && !Object.keys(fieldErrors).length && <ErrorMessage message={formError} />}
            <StarRatingInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} error={fieldErrors.rating} />
            <FormField
              id="review-body" as="textarea" rows={4} label="Your review"
              hint={`${form.body.trim().length}/1000. Write at least 10 characters about your experience.`}
              value={form.body} error={fieldErrors.body} maxLength={1000}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="flex gap-3">
              <button disabled={busy} className="rounded bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish review'}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(false); setFieldErrors({}); setFormError(''); }} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ── public list ── */}
      {list && list.items.length > 0 && (
        <>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.items.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
          {page < list.pagination.totalPages && (
            <div className="mt-6 text-center">
              <button onClick={() => loadList(page + 1, true)} className="rounded border border-gray-300 bg-white px-5 py-2 text-sm font-medium hover:border-forest">
                Show more reviews
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmationDialog
        open={confirmDelete} danger title="Delete your review?"
        message="Your rating will be removed from this broker's average. You can write a new review later."
        confirmLabel="Delete review" onConfirm={remove} onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
