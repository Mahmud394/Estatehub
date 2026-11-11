import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheck, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import ConfirmationDialog from './ConfirmationDialog.jsx';
import { ErrorMessage } from './StateViews.jsx';
import { timeAgo } from '../utils/format.js';

const MAX = 1000;
const PAGE_SIZE = 10;

// Public comments on one listing. Everyone can read. Clients (and the listing's own broker, to answer
// questions) can write. Authors can edit and delete their own comments.
export default function CommentsSection({ propertyId, brokerId }) {
  const { user } = useAuth();
  const location = useLocation();
  const canWrite = !!user && (user.role === 'client' || (user.role === 'broker' && user.id === brokerId));

  const [data, setData] = useState(null); // { items, pagination }
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // { id, body }
  const [editError, setEditError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async (page = 1, append = false) => {
    try {
      const d = await api(`/comments?propertyId=${propertyId}&page=${page}&limit=${PAGE_SIZE}`);
      setData((prev) => (append && prev ? { ...d, items: [...prev.items, ...d.items] } : d));
      setError('');
    } catch (err) { setError(err.message); }
  }, [propertyId]);

  // Reload when the property changes or when the user logs in/out (the API marks which comments are yours).
  useEffect(() => { load(1); }, [load, user?.id]);

  const post = async (e) => {
    e.preventDefault();
    setPostError(''); setNotice('');
    setPosting(true);
    try {
      const created = await api('/comments', { method: 'POST', body: { propertyId, body } });
      setData((d) => ({ ...d, items: [created, ...(d?.items || [])], pagination: { ...d.pagination, total: d.pagination.total + 1 } }));
      setBody('');
      setNotice('Your comment was posted.');
    } catch (err) {
      setPostError(err.errors?.body || err.message);
    } finally { setPosting(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      const updated = await api(`/comments/${editing.id}`, { method: 'PATCH', body: { body: editing.body } });
      setData((d) => ({ ...d, items: d.items.map((c) => (c.id === updated.id ? updated : c)) }));
      setEditing(null);
    } catch (err) { setEditError(err.errors?.body || err.message); }
  };

  const remove = async () => {
    const target = toDelete;
    setToDelete(null);
    try {
      await api(`/comments/${target.id}`, { method: 'DELETE' });
      setData((d) => ({ ...d, items: d.items.filter((c) => c.id !== target.id), pagination: { ...d.pagination, total: d.pagination.total - 1 } }));
      setNotice('Comment deleted.');
    } catch (err) { setError(err.message); }
  };

  const total = data?.pagination.total ?? 0;
  const page = data?.pagination.page ?? 1;

  return (
    <section id="comments" className="mt-12" aria-labelledby="comments-title">
      <h2 id="comments-title" className="text-2xl">Questions and comments{data ? ` (${total})` : ''}</h2>
      <p className="mt-1 text-sm text-gray-600">Comments are public. For private questions, message the broker instead.</p>

      {/* ── write ── */}
      <div className="mt-5" aria-live="polite">
        {notice && <p role="status" className="mb-3 rounded bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
        {canWrite ? (
          <form onSubmit={post} noValidate>
            <label htmlFor="comment-body" className="mb-1 block text-sm font-medium">
              {user.role === 'broker' ? 'Reply as the listing broker' : 'Add a comment'}
            </label>
            <textarea
              id="comment-body" rows={3} maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Ask about the property, the area or the viewing…"
              aria-invalid={!!postError} aria-describedby={postError ? 'comment-err' : undefined}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
            />
            <div className="mt-1 flex items-center justify-between">
              <span id="comment-err" className="text-xs text-red-700">{postError}</span>
              <span className="text-xs text-gray-500">{body.length}/{MAX}</span>
            </div>
            <button disabled={posting || !body.trim()} className="mt-2 rounded bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-50">
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        ) : !user ? (
          <p className="rounded border border-gray-200 bg-white p-4 text-sm">
            <Link to="/login" state={{ from: location.pathname }} className="font-semibold text-forest underline">Log in</Link> or{' '}
            <Link to="/register" className="font-semibold text-forest underline">create a client account</Link> to join the conversation.
          </p>
        ) : (
          <p className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Only client accounts and the listing broker can comment on a property.
          </p>
        )}
      </div>

      {/* ── list ── */}
      {error && <div className="mt-4"><ErrorMessage message={error} onRetry={() => load(1)} /></div>}
      {data && data.items.length === 0 && <p className="mt-6 text-gray-500">No comments yet. Be the first to ask a question.</p>}
      <ul className="mt-6 space-y-5">
        {(data?.items || []).map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.author.name} url={c.author.avatarUrl} className="h-10 w-10 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-semibold">{c.author.name}</span>
                {c.author.role === 'broker' && (
                  <span className="flex items-center gap-1 rounded bg-forest/10 px-1.5 py-0.5 text-xs font-medium text-forest">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Listing broker
                  </span>
                )}
                <span className="text-xs text-gray-500">{timeAgo(c.createdAt)}{c.edited ? ' · edited' : ''}</span>
              </p>

              {editing?.id === c.id ? (
                <form onSubmit={saveEdit} className="mt-2">
                  <label htmlFor={`edit-${c.id}`} className="sr-only">Edit your comment</label>
                  <textarea id={`edit-${c.id}`} rows={3} maxLength={MAX} value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest" />
                  {editError && <p className="mt-1 text-xs text-red-700">{editError}</p>}
                  <div className="mt-2 flex gap-2">
                    <button className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white">Save</button>
                    <button type="button" onClick={() => { setEditing(null); setEditError(''); }} className="rounded border border-gray-300 px-4 py-1.5 text-sm">Cancel</button>
                  </div>
                </form>
              ) : (
                <p className="mt-1 whitespace-pre-line break-words text-gray-800">{c.body}</p>
              )}

              {editing?.id !== c.id && (c.canEdit || c.canDelete) && (
                <p className="mt-1 flex gap-3 text-xs">
                  {c.canEdit && (
                    <button onClick={() => { setEditing({ id: c.id, body: c.body }); setEditError(''); }} className="flex items-center gap-1 text-gray-600 hover:text-forest">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </button>
                  )}
                  {c.canDelete && (
                    <button onClick={() => setToDelete(c)} className="flex items-center gap-1 text-gray-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                    </button>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {data && page < data.pagination.totalPages && (
        <div className="mt-6">
          <button onClick={() => load(page + 1, true)} className="rounded border border-gray-300 bg-white px-5 py-2 text-sm font-medium hover:border-forest">
            Show older comments
          </button>
        </div>
      )}

      <ConfirmationDialog
        open={!!toDelete} danger title="Delete this comment?" message="This cannot be undone."
        confirmLabel="Delete" onConfirm={remove} onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
