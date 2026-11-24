import { useState } from 'react';
import { usePagedAdmin } from '../../hooks/usePagedAdmin.js';
import { FilterSelect, ListFrame, StatusPill, useAction } from '../../components/AdminBits.jsx';

export default function AdminBrokers() {
  const [status, setStatus] = useState('pending');
  const list = usePagedAdmin('/admin/brokers', { status });
  const { run, banner } = useAction(list.reload);
  return (
    <section aria-labelledby="ab">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="ab" className="text-2xl">Broker verification</h2>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={['pending', 'approved', 'rejected']} />
      </div>
      {banner}
      <ListFrame list={list} emptyTitle="No brokers here">
        {(items) => (
          <ul className="space-y-3">
            {items.map((b) => (
              <li key={b.id} className="rounded border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{b.fullName}</p>
                    <p className="text-sm text-gray-600">{b.email}</p>
                    <p className="text-sm text-gray-600">{b.companyName || 'No company name'} · License: {b.licenseNumber || 'not provided'}</p>
                  </div>
                  <div className="flex gap-2"><StatusPill value={b.verificationStatus} />{b.userStatus === 'suspended' && <StatusPill value="suspended" />}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  {b.verificationStatus !== 'approved' && <button onClick={() => run(`/admin/brokers/${b.id}/verify`, 'POST', undefined, 'Broker verified.')} className="rounded bg-forest px-3 py-1.5 text-sm text-white">Verify</button>}
                  {b.verificationStatus !== 'rejected' && <button onClick={() => run(`/admin/brokers/${b.id}/reject`, 'POST', {}, 'Broker rejected.')} className="rounded border border-red-700 px-3 py-1.5 text-sm text-red-700">Reject</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListFrame>
    </section>
  );
}
