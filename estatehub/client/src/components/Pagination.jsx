import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex items-center gap-1 rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
      </button>
      <span className="text-sm text-gray-600" aria-current="page">Page {page} of {totalPages}</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex items-center gap-1 rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
      >
        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
