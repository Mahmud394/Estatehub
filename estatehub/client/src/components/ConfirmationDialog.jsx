import { useEffect, useRef } from 'react';

// Accessible confirm dialog built on the native <dialog> element (Esc closes it, focus is trapped).
export default function ConfirmationDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="w-full max-w-md rounded bg-white p-6 shadow-2xl backdrop:bg-midnight/60"
    >
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 text-gray-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded px-4 py-2 text-white ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-forest hover:bg-forest/90'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
