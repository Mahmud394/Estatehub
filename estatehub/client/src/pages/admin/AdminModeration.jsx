import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePagedAdmin } from '../../hooks/usePagedAdmin.js';
import { FilterSelect, ListFrame, StatusPill, useAction } from '../../components/AdminBits.jsx';
import Stars from '../../components/Stars.jsx';

export default function AdminModeration() {
  const [kind, setKind] = useState('comments'); // 'comments' | 'reviews'
  const [status, setStatus] = useState('');
  const list = usePagedAdmin(`/admin/${kind}`, { status });
  const { run, banner } = useAction(list.reload);
  const singular = kind === 'comments' ? 'comment' : 'review';

  return (
    <section aria-labelledby="am">
      <h2 id="am" className="mb-4 text-2xl">Comments and reviews</h2>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div role="tablist" aria-label="Content type" className="flex overflow-hidden rounded border border-gray-300">
          {['comments', 'reviews'].map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setStatus(''); }}
              className={`px-4 py-1.5 text-sm ${kind === k ? 'bg-forest text-white' : 'bg-white'}`}>{k}</button>
          ))}
        </div>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={['visible', 'hidden']} />
      </div>
      {banner}
      <ListFrame list={list} emptyTitle={`No ${kind} here`}>
        {(items) => (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="rounded border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600">
                      {it.authorName}
                      {kind === 'comments'
                        ? <> on <Link className="text-forest underline" to={`/properties/${it.propertyId}`}>{it.propertyTitle}</Link></>
                        : <> about broker <Link className="text-forest underline" to={`/brokers/${it.brokerId}`}>{it.brokerName}</Link></>}
                    </p>
                    {kind === 'reviews' && <div className="mt-1"><Stars value={it.rating} /></div>}
                    <p className="mt-2 whitespace-pre-line break-words">{it.body}</p>
                  </div>
                  <StatusPill value={it.status} />
                </div>
                <div className="mt-3">
                  {it.status === 'visible'
                    ? <button onClick={() => run(`/admin/${kind}/${it.id}/status`, 'PATCH', { status: 'hidden' }, `${singular} hidden.`)} className="rounded border border-red-700 px-3 py-1.5 text-sm text-red-700">Hide</button>
                    : <button onClick={() => run(`/admin/${kind}/${it.id}/status`, 'PATCH', { status: 'visible' }, `${singular} is visible again.`)} className="rounded bg-forest px-3 py-1.5 text-sm text-white">Show again</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListFrame>
    </section>
  );
}
