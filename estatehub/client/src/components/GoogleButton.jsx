import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// "Continue with Google". Renders nothing unless VITE_GOOGLE_CLIENT_ID is set (so the site works without it).
// Google's own script draws the button and hands us an ID token, which the server verifies.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SRC = 'https://accounts.google.com/gsi/client';

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[src="${SRC}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = SRC; s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener('load', resolve);
    s.addEventListener('error', reject);
  });
}

export default function GoogleButton({ role = 'client', onSuccess, onError }) {
  const { googleLogin } = useAuth();
  const box = useRef(null);
  const roleRef = useRef(role);
  const [failed, setFailed] = useState(false);
  roleRef.current = role; // the button is drawn once, but always sends the latest chosen role

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const result = await googleLogin(credential, roleRef.current);
            onSuccess?.(result);
          } catch (err) {
            onError?.(err.message);
          }
        },
      });
      window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 320 });
    }).catch(() => setFailed(true));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null;
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
      </div>
      <div ref={box} className="flex justify-center" />
      {failed && <p className="mt-2 text-center text-sm text-red-700">Google sign-in could not load. Check your connection or use your email.</p>}
    </div>
  );
}
