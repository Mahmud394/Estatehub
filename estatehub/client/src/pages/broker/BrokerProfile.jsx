import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import FormField from '../../components/FormField.jsx';
import { ErrorMessage } from '../../components/StateViews.jsx';

export default function BrokerProfile() {
  const { user, brokerProfile, refresh } = useAuth();
  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone || '',
    companyName: brokerProfile?.companyName || '',
    serviceAreas: brokerProfile?.serviceAreas || '',
    bio: brokerProfile?.bio || '',
  });
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
      setNotice('Profile saved.');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors || {});
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/broker" className="text-sm text-forest underline">← Back to dashboard</Link>
      <h1 className="mt-3 text-4xl">Profile settings</h1>
      <p className="mt-1 text-sm text-gray-600">Email: {user.email} · Verification: {brokerProfile?.verificationStatus}</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}
        {notice && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
        <FormField id="fullName" label="Full name" value={form.fullName} error={fieldErrors.fullName} onChange={set('fullName')} />
        <FormField id="phone" label="Phone" value={form.phone} error={fieldErrors.phone} onChange={set('phone')} />
        <FormField id="companyName" label="Company name" value={form.companyName} error={fieldErrors.companyName} onChange={set('companyName')} />
        <FormField id="serviceAreas" label="Service areas" hint="Comma-separated, e.g. Uttara, Mirpur" value={form.serviceAreas} error={fieldErrors.serviceAreas} onChange={set('serviceAreas')} />
        <FormField id="bio" as="textarea" rows={4} label="About you" value={form.bio} error={fieldErrors.bio} onChange={set('bio')} />
        <button className="rounded bg-forest px-6 py-2.5 font-semibold text-white hover:bg-forest/90">Save profile</button>
      </form>
    </div>
  );
}
