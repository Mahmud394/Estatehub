import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { ErrorMessage, LoadingSpinner } from '../../components/StateViews.jsx';
import { formatDate } from '../../utils/format.js';

const CARDS = [
  { key: 'pendingListings', label: 'Listings waiting for approval', to: '/admin/listings', urgent: true },
  { key: 'pendingBrokers', label: 'Brokers waiting for verification', to: '/admin/brokers', urgent: true },
  { key: 'openReports', label: 'Open reports', to: '/admin/reports', urgent: true },
  { key: 'approvedListings', label: 'Public listings', to: '/admin/listings' },
  { key: 'activeUsers', label: 'Active users', to: '/admin/users' },
  { key: 'suspendedUsers', label: 'Suspended users', to: '/admin/users' },
  { key: 'hiddenComments', label: 'Hidden comments', to: '/admin/moderation' },
  { key: 'hiddenReviews', label: 'Hidden reviews', to: '/admin/moderation' },
];

function TestEmail() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const send = async () => {
    setBusy(true); setResult(null);
    try {
      const d = await api('/admin/mail/test', { method: 'POST' });
      setResult({ ok: true, text: `Sent to ${d.to}. Check the inbox (and spam).` });
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-8 rounded border border-gray-200 bg-white p-5">
      <h2 className="text-xl">Email check</h2>
      <p className="mt-1 text-sm text-gray-600">Sends a test email to your own admin address to confirm SMTP works on this site.</p>
      <button onClick={send} disabled={busy} className="mt-3 rounded bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Sending…' : 'Send test email'}
      </button>
      {result && <p role="status" className={`mt-3 text-sm ${result.ok ? 'text-green-800' : 'text-red-700'}`}>{result.text}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, error, reload } = useApi('/admin/stats');
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return <LoadingSpinner />;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.to}
            className={`rounded border bg-white p-5 hover:border-forest ${c.urgent && data.counts[c.key] > 0 ? 'border-amber-400' : 'border-gray-200'}`}>
            <p className="text-3xl font-semibold">{data.counts[c.key]}</p>
            <p className="mt-1 text-sm text-gray-600">{c.label}</p>
          </Link>
        ))}
      </div>
      <TestEmail />
      <h2 className="mt-10 text-2xl">Recent admin activity</h2>
      {data.recentActivity.length === 0 ? <p className="mt-3 text-gray-500">No admin actions yet.</p> : (
        <ul className="mt-3 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {data.recentActivity.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <span><strong>{a.adminName}</strong> · {a.action.replace(/_/g, ' ')} · {a.targetType} #{a.targetId}</span>
              <span className="text-gray-500">{formatDate(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
