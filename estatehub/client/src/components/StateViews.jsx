import { Loader2, SearchX, AlertTriangle } from 'lucide-react';

export function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-gray-600">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <SearchX className="h-10 w-10 text-gold" aria-hidden="true" />
      <h3 className="mt-3 text-xl">{title}</h3>
      {message && <p className="mt-1 max-w-md text-gray-600">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-red-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-sm font-medium underline">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
