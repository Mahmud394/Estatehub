import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-5xl">Page not found</h1>
      <p className="mt-3 text-gray-600">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-block rounded bg-forest px-5 py-2.5 text-white">Go home</Link>
    </div>
  );
}
