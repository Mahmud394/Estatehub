import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';
import { ErrorMessage } from '../components/StateViews.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">Welcome back</h1>
      <p className="mt-2 text-gray-600">Log in to manage listings, favorites and messages.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}
        <FormField id="email" label="Email" type="email" autoComplete="email" required value={form.email}
          error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password" required value={form.password}
          error={fieldErrors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button disabled={busy} className="w-full rounded bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        New to EstateHub? <Link to="/register" className="font-semibold text-forest underline">Create an account</Link>
      </p>
    </div>
  );
}
