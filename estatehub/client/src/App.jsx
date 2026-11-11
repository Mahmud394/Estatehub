import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Properties from './pages/Properties.jsx';
import PropertyDetails from './pages/PropertyDetails.jsx';
import Brokers from './pages/Brokers.jsx';
import BrokerPublicProfile from './pages/BrokerPublicProfile.jsx';
import StaticPage from './pages/StaticPage.jsx';
import NotFound from './pages/NotFound.jsx';
import BrokerDashboard from './pages/broker/BrokerDashboard.jsx';
import PropertyForm from './pages/broker/PropertyForm.jsx';
import BrokerProfile from './pages/broker/BrokerProfile.jsx';
import BrokerComments from './pages/broker/BrokerComments.jsx';
import Messages from './pages/Messages.jsx';
import Favorites from './pages/Favorites.jsx';
import Account from './pages/Account.jsx';

const client = (el) => <ProtectedRoute roles={['client']}>{el}</ProtectedRoute>;
const broker = (el) => <ProtectedRoute roles={['broker']}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/brokers" element={<Brokers />} />
        <Route path="/brokers/:id" element={<BrokerPublicProfile />} />
        <Route path="/about" element={<StaticPage page="about" />} />
        <Route path="/terms" element={<StaticPage page="terms" />} />
        <Route path="/privacy" element={<StaticPage page="privacy" />} />

        <Route path="/broker" element={broker(<BrokerDashboard />)} />
        <Route path="/broker/properties/new" element={broker(<PropertyForm />)} />
        <Route path="/broker/properties/:id/edit" element={broker(<PropertyForm />)} />
        <Route path="/broker/profile" element={broker(<BrokerProfile />)} />
        <Route path="/broker/messages" element={broker(<Messages basePath="/broker/messages" />)} />
        <Route path="/broker/messages/:id" element={broker(<Messages basePath="/broker/messages" />)} />
        <Route path="/broker/comments" element={broker(<BrokerComments />)} />

        <Route path="/favorites" element={client(<Favorites />)} />
        <Route path="/messages" element={client(<Messages basePath="/messages" />)} />
        <Route path="/messages/:id" element={client(<Messages basePath="/messages" />)} />
        <Route path="/account" element={client(<Account />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
