import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import FormField from '../components/FormField.jsx';
import { ErrorMessage } from '../components/StateViews.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setFieldError('');
    if (password !== confirm) return setFieldError('The two passwords do not match.');
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setFieldError(err.errors?.password || '');
      setError(err.errors?.token || (err.errors?.password ? '' : err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">Choose a new password</h1>
      {done ? (
        <div className="mt-8">
          <p role="status" className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-900">Password changed. You can log in now.</p>
          <Link to="/login" className="mt-4 inline-block rounded bg-forest px-4 py-2.5 font-semibold text-white">Go to log in</Link>
        </div>
      ) : !token ? (
        <p className="mt-8 text-gray-600">This link is incomplete. <Link to="/forgot-password" className="font-semibold text-forest underline">Request a new one</Link>.</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          {error && <ErrorMessage message={error} />}
          <FormField id="password" label="New password" type="password" autoComplete="new-password" required value={password}
            hint="At least 8 characters, with a letter and a number." error={fieldError}
            onChange={(e) => setPassword(e.target.value)} />
          <FormField id="confirm" label="Confirm new password" type="password" autoComplete="new-password" required value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
          <button disabled={busy} className="w-full rounded bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}
    </div>
  );
}
