import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';
import { ErrorMessage } from '../components/StateViews.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', companyName: '',
    role: params.get('role') === 'broker' ? 'broker' : 'client',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      await register(form);
      navigate(form.role === 'broker' ? '/broker' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">Create your account</h1>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}

        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am a…</legend>
          <div className="grid grid-cols-2 gap-3">
            {[['client', 'Buyer / Renter'], ['broker', 'Broker']].map(([value, label]) => (
              <label key={value} className={`cursor-pointer rounded border px-3 py-2 text-center text-sm ${form.role === value ? 'border-forest bg-forest text-white' : 'border-gray-300 bg-white'}`}>
                <input type="radio" name="role" value={value} checked={form.role === value} onChange={set('role')} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <FormField id="fullName" label="Full name" autoComplete="name" required value={form.fullName} error={fieldErrors.fullName} onChange={set('fullName')} />
        <FormField id="email" label="Email" type="email" autoComplete="email" required value={form.email} error={fieldErrors.email} onChange={set('email')} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password" required value={form.password}
          error={fieldErrors.password} hint="At least 8 characters, with a letter and a number." onChange={set('password')} />
        <FormField id="phone" label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} error={fieldErrors.phone} onChange={set('phone')} />
        {form.role === 'broker' && (
          <FormField id="companyName" label="Company name" value={form.companyName} error={fieldErrors.companyName} onChange={set('companyName')} />
        )}

        <button disabled={busy} className="w-full rounded bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        Already registered? <Link to="/login" className="font-semibold text-forest underline">Log in</Link>
      </p>
    </div>
  );
}
