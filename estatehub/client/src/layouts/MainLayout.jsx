import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

// The navbar is fixed (64px tall), so normal pages get top padding.
// The homepage hero is full-bleed and sits underneath the transparent navbar instead.
export default function MainLayout() {
  const isHome = useLocation().pathname === '/';
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={`flex-1 ${isHome ? '' : 'pt-16'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
