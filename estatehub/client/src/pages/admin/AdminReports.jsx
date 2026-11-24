import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePagedAdmin } from '../../hooks/usePagedAdmin.js';
import { FilterSelect, ListFrame, StatusPill, useAction } from '../../components/AdminBits.jsx';
import { formatDate } from '../../utils/format.js';

export default function AdminReports() {
  const [status, setStatus] = useState('open');
  const [targetType, setTargetType] = useState('');
  const list = usePagedAdmin('/admin/reports', { status, targetType });
  const { run, banner } = useAction(list.reload);

  return (
    <section aria-labelledby="ar">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="ar" className="text-2xl">Reports</h2>
        <div className="flex gap-4">
          <FilterSelect label="Status" value={status} onChange={setStatus} options={['open', 'resolved', 'dismissed']} />
          <FilterSelect label="Type" value={targetType} onChange={setTargetType} options={['property', 'comment', 'review', 'user']} />
        </div>
      </div>
      {banner}
      <ListFrame list={list} emptyTitle="No reports here">
        {(items) => (
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="rounded border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600">{r.targetType} #{r.targetId} · reported by {r.reporterName} · {formatDate(r.createdAt)}</p>
                    <p className="mt-2 font-medium">Reason: <span className="font-normal">{r.reason}</span></p>
                    <div className="mt-2 rounded bg-gray-50 p-3 text-sm">
                      {r.target ? (
                        <>
                          <span className="break-words">{r.target.label}</span>
                          {r.target.status && <span className="ml-2"><StatusPill value={r.target.status} /></span>}
                          {r.target.link && <Link to={r.target.link} className="ml-3 text-forest underline">Open</Link>}
                        </>
                      ) : <span className="text-gray-500">The reported item no longer exists.</span>}
                    </div>
                    {r.handledBy && <p className="mt-2 text-xs text-gray-500">Handled by {r.handledBy}</p>}
                  </div>
                  <StatusPill value={r.status} />
                </div>
                {r.status === 'open' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => run(`/admin/reports/${r.id}`, 'PATCH', { status: 'resolved' }, 'Report marked as resolved.')} className="rounded bg-forest px-3 py-1.5 text-sm text-white">Mark resolved</button>
                    <button onClick={() => run(`/admin/reports/${r.id}`, 'PATCH', { status: 'dismissed' }, 'Report dismissed.')} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Dismiss</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </ListFrame>
      <p className="mt-4 text-xs text-gray-500">To act on the reported item (hide a comment, suspend a user, reject a listing), use the matching admin tab, then mark the report resolved.</p>
    </section>
  );
}
