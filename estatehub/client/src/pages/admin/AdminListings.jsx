import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePagedAdmin } from '../../hooks/usePagedAdmin.js';
import { FilterSelect, ListFrame, ReasonDialog, StatusPill, useAction } from '../../components/AdminBits.jsx';

export default function AdminListings() {
  const [status, setStatus] = useState('pending');
  const list = usePagedAdmin('/admin/properties', { status });
  const { run, banner } = useAction(list.reload);
  const [rejecting, setRejecting] = useState(null);

  return (
    <section aria-labelledby="al">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="al" className="text-2xl">Listings</h2>
        <FilterSelect label="Approval" value={status} onChange={setStatus} options={['pending', 'approved', 'rejected']} />
      </div>
      {banner}
      <ListFrame list={list} emptyTitle="No listings here">
        {(items) => (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.id} className="rounded border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/properties/${p.id}`} className="font-semibold text-forest underline">{p.title}</Link>
                    <p className="text-sm text-gray-600">{p.category} for {p.purpose} · {p.area}, {p.city} · ৳{Number(p.price).toLocaleString('en-US')}</p>
                    <p className="text-sm text-gray-600">Broker: {p.brokerName}{p.isDemo ? ' · demo listing' : ''}</p>
                    {p.rejectionReason && <p className="mt-1 text-sm text-red-800">Reason: {p.rejectionReason}</p>}
                  </div>
                  <StatusPill value={p.approvalStatus} />
                </div>
                <div className="mt-3 flex gap-2">
                  {p.approvalStatus !== 'approved' && (
                    <button onClick={() => run(`/admin/properties/${p.id}/approve`, 'POST', undefined, 'Listing approved.')} className="rounded bg-forest px-3 py-1.5 text-sm text-white">Approve</button>
                  )}
                  {p.approvalStatus !== 'rejected' && (
                    <button onClick={() => setRejecting(p)} className="rounded border border-red-700 px-3 py-1.5 text-sm text-red-700">Reject</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListFrame>
      <ReasonDialog open={!!rejecting} title="Reject this listing" onCancel={() => setRejecting(null)}
        onSubmit={async (reason) => { const p = rejecting; setRejecting(null); await run(`/admin/properties/${p.id}/reject`, 'POST', { reason }, 'Listing rejected.'); }} />
    </section>
  );
}
