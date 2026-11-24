import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// "Report" link + modal form. Sends POST /api/reports. The server decides who may report what;
// admins do not see the button (they moderate instead).
// targetType: 'property' | 'comment' | 'review' | 'user'
export default function ReportButton({ targetType, targetId, label = 'Report', className = '' }) {
  const { user } = useAuth();
  const location = useLocation();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  if (user?.role === 'admin') return null;

  const close = () => { setOpen(false); setReason(''); setError(''); setDone(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/reports', { method: 'POST', body: { targetType, targetId, reason } });
      setDone('Thank you. Your report was sent to the moderation team.');
    } catch (err) {
      setError(err.errors?.reason || err.message);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-xs text-gray-500 hover:text-red-700 ${className}`}>
        <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </button>

      <dialog ref={ref} onCancel={(e) => { e.preventDefault(); close(); }}
        className="w-full max-w-md rounded bg-white p-6 shadow-2xl backdrop:bg-midnight/60">
        <h2 className="text-2xl">Report this {targetType === 'user' ? 'broker' : targetType}</h2>
        {!user ? (
          <>
            <p className="mt-2 text-gray-600">Please log in to send a report.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={close} className="rounded border border-gray-300 px-4 py-2">Cancel</button>
              <Link to="/login" state={{ from: location.pathname }} className="rounded bg-forest px-4 py-2 text-white">Log in</Link>
            </div>
          </>
        ) : done ? (
          <>
            <p role="status" className="mt-3 rounded bg-green-50 p-3 text-sm text-green-900">{done}</p>
            <div className="mt-6 flex justify-end"><button onClick={close} className="rounded bg-forest px-4 py-2 text-white">Close</button></div>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="mt-2 text-sm text-gray-600">Tell us what is wrong. Only administrators can see your report, and the person you report is not told who sent it.</p>
            <label htmlFor={`report-${targetType}-${targetId}`} className="mt-4 mb-1 block text-sm font-medium">Reason</label>
            <textarea id={`report-${targetType}-${targetId}`} rows={4} maxLength={500} value={reason}
              onChange={(e) => setReason(e.target.value)} aria-invalid={!!error}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest" />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-red-700">{error}</span>
              <span className="text-gray-500">{reason.trim().length}/500 (min 10)</span>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={close} className="rounded border border-gray-300 px-4 py-2">Cancel</button>
              <button disabled={busy} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send report'}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
