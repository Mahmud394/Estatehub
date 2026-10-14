// Label + input + inline error, wired for screen readers.
export default function FormField({ id, label, error, hint, as = 'input', children, ...props }) {
  const Tag = as;
  const base =
    'w-full rounded border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 ' +
    (error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-forest focus:ring-forest');
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <Tag id={id} className={base} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props}>
        {children}
      </Tag>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
