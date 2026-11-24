import { usePagedAdmin } from '../../hooks/usePagedAdmin.js';
import { ListFrame } from '../../components/AdminBits.jsx';
import { formatDate } from '../../utils/format.js';

export default function AdminAudit() {
  const list = usePagedAdmin('/admin/audit-logs', {});
  return (
    <section aria-labelledby="aa">
      <h2 id="aa" className="mb-4 text-2xl">Audit log</h2>
      <p className="mb-4 text-sm text-gray-600">Every moderation action and every time an admin opens a private conversation (read-only) is recorded here.</p>
      <ListFrame list={list} emptyTitle="No audit entries yet">
        {(items) => (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Admin</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-4 py-2">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-2">{a.adminName}</td>
                    <td className="px-4 py-2">{a.action.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2">{a.targetType} #{a.targetId}</td>
                    <td className="px-4 py-2 text-gray-600">{a.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListFrame>
    </section>
  );
}
