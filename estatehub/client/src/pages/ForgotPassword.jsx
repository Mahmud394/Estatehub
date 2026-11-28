import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import FormField from '../components/FormField.jsx';
import { ErrorMessage } from '../components/StateViews.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setDone('If an account exists for that email, a reset link is on its way. It expires in 30 minutes. Check your spam folder too.');
    } catch (err) {
      setError(err.errors?.email || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">Forgot password?</h1>
      <p className="mt-2 text-gray-600">Enter your email and we will send you a link to choose a new password.</p>
      {done ? (
        <p role="status" className="mt-8 rounded border border-green-300 bg-green-50 p-4 text-sm text-green-900">{done}</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          {error && <ErrorMessage message={error} />}
          <FormField id="email" label="Email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <button disabled={busy} className="w-full rounded bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-gray-600"><Link to="/login" className="font-semibold text-forest underline">Back to log in</Link></p>
    </div>
  );
}
