import { useState } from 'react';
import { usePagedAdmin } from '../../hooks/usePagedAdmin.js';
import { FilterSelect, ListFrame, StatusPill, useAction } from '../../components/AdminBits.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = usePagedAdmin('/admin/users', { role, status, q: search });
  const { run, banner } = useAction(list.reload);
  const [target, setTarget] = useState(null);

  return (
    <section aria-labelledby="au">
      <h2 id="au" className="mb-4 text-2xl">Users</h2>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} className="flex gap-2">
          <label className="sr-only" htmlFor="user-q">Search name or email</label>
          <input id="user-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm" />
          <button className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm">Search</button>
        </form>
        <FilterSelect label="Role" value={role} onChange={setRole} options={['client', 'broker', 'admin']} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={['active', 'suspended']} />
      </div>
      {banner}
      <ListFrame list={list} emptyTitle="No users found">
        {(items) => (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2">{u.fullName}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2"><StatusPill value={u.status} /></td>
                    <td className="px-4 py-2 text-right">
                      {u.role !== 'admin' && u.id !== me.id && (
                        u.status === 'active'
                          ? <button onClick={() => setTarget(u)} className="text-red-700 underline">Suspend</button>
                          : <button onClick={() => run(`/admin/users/${u.id}/status`, 'PATCH', { status: 'active' }, 'User activated.')} className="text-forest underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListFrame>
      <ConfirmationDialog open={!!target} danger title={`Suspend ${target?.fullName || ''}?`}
        message="They will be logged out immediately and cannot log in until you activate the account again."
        confirmLabel="Suspend"
        onCancel={() => setTarget(null)}
        onConfirm={async () => { const u = target; setTarget(null); await run(`/admin/users/${u.id}/status`, 'PATCH', { status: 'suspended' }, 'User suspended.'); }} />
    </section>
  );
}
