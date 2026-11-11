import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Avatar from '../../components/Avatar.jsx';
import Pagination from '../../components/Pagination.jsx';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../components/StateViews.jsx';
import { timeAgo } from '../../utils/format.js';

// Comments left on the broker's own listings. Opening this page clears the "new comment" bell entries.
export default function BrokerComments() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let off = false;
    api(`/comments/mine?page=${page}&limit=10`)
      .then((d) => { if (!off) { setData(d); setError(''); window.dispatchEvent(new Event('estatehub:notifications')); } })
      .catch((e) => !off && setError(e.message));
    return () => { off = true; };
  }, [page]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl">Comments on my listings</h1>
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
      {!data && !error && <LoadingSpinner />}
      {data && data.items.length === 0 && <div className="mt-6"><EmptyState title="No comments yet" message="Comments from clients will appear here." /></div>}
      <ul className="mt-6 space-y-5">
        {(data?.items || []).map((c) => (
          <li key={c.id} className="flex gap-3 rounded border border-gray-200 bg-white p-4">
            <Avatar name={c.author.name} url={c.author.avatarUrl} className="h-10 w-10 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="font-semibold">{c.author.name}</span> <span className="text-xs text-gray-500">on </span>
                <Link to={`/properties/${c.propertyId}#comments`} className="text-forest underline">{c.propertyTitle}</Link>
                <span className="text-xs text-gray-500"> · {timeAgo(c.createdAt)}</span></p>
              <p className="mt-1 whitespace-pre-line break-words">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
