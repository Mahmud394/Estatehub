import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '../services/api.js';
import { usePolling } from '../hooks/usePolling.js';
import Avatar from './Avatar.jsx';
import { LoadingSpinner, ErrorMessage } from './StateViews.jsx';
import { refreshNotifications } from './NotificationBell.jsx';
import { formatDateTime, timeAgo } from '../utils/format.js';

// Private messages: conversation list on the left, thread on the right (one pane at a time on phones).
// `basePath` is '/messages' for clients and '/broker/messages' for brokers.
export default function MessagesView({ basePath }) {
  const { id } = useParams();
  const activeId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [list, setList] = useState(null);
  const [listError, setListError] = useState('');
  const [thread, setThread] = useState(null); // { conversation, messages }
  const [threadError, setThreadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const lastCount = useRef(0);

  const loadList = useCallback(async () => {
    try { setList(await api('/conversations')); setListError(''); } catch (e) { setListError(e.message); }
  }, []);

  const loadThread = useCallback(async () => {
    if (!activeId) return;
    try {
      const d = await api(`/conversations/${activeId}`);
      setThread(d); setThreadError('');
      if (d.messages.some((m) => !m.mine && !m.isRead)) {
        await api(`/conversations/${activeId}/read`, { method: 'POST' });
        loadList(); refreshNotifications();
      }
    } catch (e) { setThread(null); setThreadError(e.message); }
  }, [activeId, loadList]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { setThread(null); setThreadError(''); lastCount.current = 0; loadThread(); }, [loadThread]);
  usePolling(loadList, 30000);
  usePolling(loadThread, 8000, !!activeId);

  // Scroll down only when new messages arrive.
  useEffect(() => {
    const n = thread?.messages.length || 0;
    if (n !== lastCount.current) { lastCount.current = n; bottomRef.current?.scrollIntoView({ block: 'end' }); }
  }, [thread]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setSendError('');
    try {
      const msg = await api(`/conversations/${activeId}/messages`, { method: 'POST', body: { body: text } });
      setThread((t) => ({ ...t, messages: [...t.messages, msg] }));
      setText('');
      loadList();
    } catch (err) { setSendError(err.errors?.body || err.message); }
    finally { setSending(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); };
  const items = list?.items || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">Messages</h1>
      <div className="mt-5 grid overflow-hidden rounded border border-gray-200 bg-white md:grid-cols-[320px_1fr]" style={{ minHeight: '60vh' }}>
        {/* list */}
        <div className={`border-gray-200 md:border-r ${activeId ? 'hidden md:block' : ''}`}>
          {listError && <div className="p-3"><ErrorMessage message={listError} onRetry={loadList} /></div>}
          {!list && !listError && <LoadingSpinner />}
          {list && items.length === 0 && <p className="p-5 text-sm text-gray-600">No conversations yet.</p>}
          <ul>
            {items.map((c) => (
              <li key={c.id}>
                <Link to={`${basePath}/${c.id}`} aria-current={c.id === activeId ? 'page' : undefined}
                  className={`flex gap-3 border-b border-gray-100 p-4 hover:bg-gray-50 ${c.id === activeId ? 'bg-forest/5' : ''}`}>
                  <Avatar name={c.other.name} url={c.other.avatarUrl} className="h-10 w-10 text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{c.other.name}</span>
                      {c.unreadCount > 0 && <span className="rounded-full bg-forest px-2 text-xs text-white" aria-label={`${c.unreadCount} unread`}>{c.unreadCount}</span>}
                    </span>
                    {c.property && <span className="block truncate text-xs text-gray-500">{c.property.title}</span>}
                    {c.lastMessage && (
                      <span className="block truncate text-xs text-gray-600">
                        {c.lastMessage.mine ? 'You: ' : ''}{c.lastMessage.body} · {timeAgo(c.lastMessage.createdAt)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* thread */}
        <div className={`flex min-h-[60vh] flex-col ${activeId ? '' : 'hidden md:flex'}`}>
          {!activeId && <p className="m-auto p-6 text-gray-500">Select a conversation to read it.</p>}
          {activeId && threadError && <div className="p-4"><ErrorMessage message={threadError} onRetry={loadThread} /></div>}
          {activeId && !thread && !threadError && <LoadingSpinner />}
          {thread && (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 p-4">
                <button onClick={() => navigate(basePath)} className="md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
                <Avatar name={thread.conversation.other.name} url={thread.conversation.other.avatarUrl} className="h-9 w-9 text-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{thread.conversation.other.name}</p>
                  {thread.conversation.property && (
                    <Link to={`/properties/${thread.conversation.property.id}`} className="block truncate text-xs text-forest underline">{thread.conversation.property.title}</Link>
                  )}
                </div>
              </div>
              <ul className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '55vh' }} aria-live="polite" aria-label="Messages">
                {thread.messages.map((m, i) => {
                  const lastMine = m.mine && !thread.messages.slice(i + 1).some((x) => x.mine);
                  return (
                    <li key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                      <p className={`max-w-[85%] whitespace-pre-line break-words rounded-lg px-3 py-2 text-sm ${m.mine ? 'bg-forest text-white' : 'bg-gray-100 text-gray-900'}`}>{m.body}</p>
                      <span className="mt-0.5 text-xs text-gray-500">{formatDateTime(m.createdAt)}{lastMine && m.isRead ? ' · Seen' : ''}</span>
                    </li>
                  );
                })}
                <li ref={bottomRef} aria-hidden="true" />
              </ul>
              <form onSubmit={send} className="border-t border-gray-200 p-3">
                {sendError && <p className="mb-1 text-xs text-red-700">{sendError}</p>}
                <div className="flex items-end gap-2">
                  <label htmlFor="msg-text" className="sr-only">Write a message</label>
                  <textarea id="msg-text" rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
                    placeholder="Write a message. Enter sends, Shift+Enter adds a new line."
                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest" />
                  <button disabled={sending || !text.trim()} className="flex items-center gap-1 rounded bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    <Send className="h-4 w-4" aria-hidden="true" /> Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
