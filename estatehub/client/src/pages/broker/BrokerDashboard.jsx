import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../components/StateViews.jsx';
import { formatPrice, CATEGORY_LABELS } from '../../utils/format.js';

const APPROVAL_STYLES = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function BrokerDashboard() {
  const { user, brokerProfile } = useAuth();
  const [state, setState] = useState({ loading: true });
  const [toDelete, setToDelete] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/properties/mine')
      .then((items) => setState({ items }))
      .catch((err) => setState({ error: err.message }));
  }, []);
  useEffect(load, [load]);

  const confirmDelete = async () => {
    try {
      await api(`/properties/${toDelete.id}`, { method: 'DELETE' });
      setNotice(`"${toDelete.title}" was deleted.`);
      setToDelete(null);
      load();
    } catch (err) {
      setNotice(err.message);
      setToDelete(null);
    }
  };

  const items = state.items || [];
  const count = (status) => items.filter((p) => p.approvalStatus === status).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Broker dashboard</h1>
          <p className="mt-1 text-gray-600">Hello, {user.fullName}.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/broker/profile" className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-white">Profile settings</Link>
          <Link to="/broker/properties/new" className="flex items-center gap-1 rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add property
          </Link>
        </div>
      </div>

      {brokerProfile && brokerProfile.verificationStatus !== 'approved' && (
        <p role="status" className="mt-6 rounded bg-amber-50 p-3 text-sm text-amber-900">
          Your broker account is <strong>{brokerProfile.verificationStatus}</strong>. An admin will verify it. You can still prepare listings.
        </p>
      )}
      {notice && <p role="status" className="mt-4 rounded bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[['Total listings', items.length], ['Approved', count('approved')], ['Pending approval', count('pending')], ['Rejected', count('rejected')]].map(([label, n]) => (
          <div key={label} className="rounded border border-gray-200 bg-white p-4">
            <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
            <dd className="mt-1 font-serif text-3xl">{n}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-2xl">My listings</h2>
      {state.loading && <LoadingSpinner />}
      {state.error && <ErrorMessage message={state.error} onRetry={load} />}
      {state.items && items.length === 0 && (
        <EmptyState title="No listings yet" message="Add your first property. It will be reviewed by an admin before it appears publicly."
          action={<Link to="/broker/properties/new" className="rounded bg-forest px-4 py-2 text-white">Add property</Link>} />
      )}

      {items.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-ivory text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Property</th><th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Approval</th><th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-gray-500">{CATEGORY_LABELS[p.category]} · {p.area}, {p.city}</p>
                    {p.approvalStatus === 'rejected' && p.rejectionReason && <p className="text-xs text-red-700">Reason: {p.rejectionReason}</p>}
                  </td>
                  <td className="px-4 py-3">{formatPrice(p.price, p.purpose)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-medium capitalize ${APPROVAL_STYLES[p.approvalStatus]}`}>{p.approvalStatus}</span></td>
                  <td className="px-4 py-3 capitalize">{p.availabilityStatus}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to={`/properties/${p.id}`} aria-label={`View ${p.title}`} className="rounded p-2 hover:bg-ivory"><Eye className="h-4 w-4" /></Link>
                      <Link to={`/broker/properties/${p.id}/edit`} aria-label={`Edit ${p.title}`} className="rounded p-2 hover:bg-ivory"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => setToDelete(p)} aria-label={`Delete ${p.title}`} className="rounded p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationDialog
        open={!!toDelete}
        danger
        title="Delete this listing?"
        message={toDelete ? `"${toDelete.title}" and its photos will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
