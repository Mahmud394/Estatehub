import { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';
import { ErrorMessage } from '../components/StateViews.jsx';

// Client account details (name and phone). Email and role cannot be changed here.
export default function Account() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setFieldErrors({}); setNotice('');
    try {
      await api('/auth/me', { method: 'PATCH', body: form });
      await refresh();
      setNotice('Your details were saved.');
    } catch (err) { setError(err.message); setFieldErrors(err.errors || {}); }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl">My account</h1>
      <p className="mt-1 text-sm text-gray-600">Signed in as {user.email}</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {error && !Object.keys(fieldErrors).length && <ErrorMessage message={error} />}
        {notice && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
        <FormField id="acc-name" label="Full name" value={form.fullName} error={fieldErrors.fullName} onChange={set('fullName')} />
        <FormField id="acc-phone" label="Phone" value={form.phone} error={fieldErrors.phone} onChange={set('phone')} />
        <button className="rounded bg-forest px-5 py-2 text-sm font-semibold text-white">Save</button>
      </form>
    </div>
  );
}
