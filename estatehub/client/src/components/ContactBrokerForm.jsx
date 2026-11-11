import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorMessage } from './StateViews.jsx';

// "Message the broker" card. Give it a propertyId (message is linked to that listing) or just a brokerId.
// Only client accounts can send. Visitors are asked to log in; brokers and admins see a short note.
export default function ContactBrokerForm({ propertyId, brokerId, brokerName, propertyTitle }) {
  const { user } = useAuth();
  const location = useLocation();
  const [body, setBody] = useState(propertyTitle ? `Hello, I am interested in "${propertyTitle}". Is it still available?` : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null); // conversation id after a successful send

  const box = 'rounded border border-gray-200 bg-white p-5';

  if (!user) {
    return (
      <div className={box}>
        <h2 className="font-sans text-base font-semibold">Contact {brokerName}</h2>
        <p className="mt-1 text-sm text-gray-600">Log in with a client account to send a private message.</p>
        <div className="mt-3 flex gap-3">
          <Link to="/login" state={{ from: location.pathname }} className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90">Log in</Link>
          <Link to="/register" className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Create account</Link>
        </div>
      </div>
    );
  }
  if (user.role !== 'client') {
    return <div className={box}><p className="text-sm text-gray-600">Private messages to brokers are sent from client accounts.</p></div>;
  }

  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api('/conversations', { method: 'POST', body: { propertyId, brokerId, body } });
      setSent(res.conversationId);
      setBody('');
    } catch (err) {
      setError(err.errors?.body || err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className={box}>
      <h2 className="font-sans text-base font-semibold">Message {brokerName}</h2>
      <p className="mt-1 text-xs text-gray-500">Private: only you and the broker can read it.</p>

      {sent && (
        <p role="status" className="mt-3 rounded bg-green-50 p-3 text-sm text-green-900">
          Message sent. <Link to={`/messages/${sent}`} className="font-semibold underline">Open the conversation</Link>
        </p>
      )}
      {error && <div className="mt-3"><ErrorMessage message={error} /></div>}

      <form onSubmit={send} className="mt-3" noValidate>
        <label htmlFor="contact-body" className="sr-only">Your message</label>
        <textarea
          id="contact-body" rows={4} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        />
        <button disabled={busy || !body.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-50">
          <Send className="h-4 w-4" aria-hidden="true" /> {busy ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}
