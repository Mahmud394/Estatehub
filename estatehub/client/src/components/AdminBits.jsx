import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { ErrorMessage, LoadingSpinner, EmptyState } from './StateViews.jsx';
import Pagination from './Pagination.jsx';

// Small shared pieces for the admin pages.
export function StatusPill({ value }) {
  const tone = {
    pending: 'bg-amber-100 text-amber-900', open: 'bg-amber-100 text-amber-900',
    approved: 'bg-green-100 text-green-900', visible: 'bg-green-100 text-green-900', active: 'bg-green-100 text-green-900', resolved: 'bg-green-100 text-green-900',
    rejected: 'bg-red-100 text-red-900', hidden: 'bg-red-100 text-red-900', suspended: 'bg-red-100 text-red-900',
    dismissed: 'bg-gray-100 text-gray-700',
  }[value] || 'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{value}</span>;
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="text-sm">
      <span className="mr-2 text-gray-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// Wraps loading / error / empty / pagination around a list so each admin page only renders rows.
export function ListFrame({ list, emptyTitle, children }) {
  const { data, error, loading, page, setPage, reload } = list;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return <LoadingSpinner />;
  return (
    <div aria-busy={loading}>
      {data.items.length === 0 ? <EmptyState title={emptyTitle} message="Nothing to show for this filter." /> : children(data.items)}
      <Pagination page={page} totalPages={data.pages} onChange={setPage} />
    </div>
  );
}

// Runs an admin action, shows the server's message and reloads the list. Used by every button.
export function useAction(reload) {
  const [msg, setMsg] = useState({ type: '', text: '' });
  const run = async (path, method, body, success = 'Done.') => {
    setMsg({ type: '', text: '' });
    try {
      await api(path, { method, body });
      await reload();
      setMsg({ type: 'ok', text: success });
      return true;
    } catch (err) {
      setMsg({ type: 'err', text: err.errors ? Object.values(err.errors).join(' ') : err.message });
      return false;
    }
  };
  const banner = msg.text ? (
    <p role={msg.type === 'err' ? 'alert' : 'status'}
      className={`mb-4 rounded p-3 text-sm ${msg.type === 'err' ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'}`}>{msg.text}</p>
  ) : null;
  return { run, banner };
}

// Dialog that asks the admin for a reason (used when rejecting a listing).
export function ReasonDialog({ open, title, onSubmit, onCancel }) {
  const ref = useRef(null);
  const [reason, setReason] = useState('');
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) { dlg.close(); setReason(''); }
  }, [open]);
  const tooShort = reason.trim().length < 5;
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }} className="w-full max-w-md rounded bg-white p-6 shadow-2xl backdrop:bg-midnight/60">
      <h2 className="text-2xl">{title}</h2>
      <label htmlFor="reason-text" className="mt-3 mb-1 block text-sm font-medium">Reason (the broker will see this)</label>
      <textarea id="reason-text" rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest" />
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded border border-gray-300 px-4 py-2">Cancel</button>
        <button disabled={tooShort} onClick={() => onSubmit(reason.trim())} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">Reject</button>
      </div>
    </dialog>
  );
}
