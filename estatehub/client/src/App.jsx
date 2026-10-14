import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Properties from './pages/Properties.jsx';
import PropertyDetails from './pages/PropertyDetails.jsx';
import NotFound from './pages/NotFound.jsx';
import BrokerDashboard from './pages/broker/BrokerDashboard.jsx';
import PropertyForm from './pages/broker/PropertyForm.jsx';
import BrokerProfile from './pages/broker/BrokerProfile.jsx';

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

        <Route path="/broker" element={broker(<BrokerDashboard />)} />
        <Route path="/broker/properties/new" element={broker(<PropertyForm />)} />
        <Route path="/broker/properties/:id/edit" element={broker(<PropertyForm />)} />
        <Route path="/broker/profile" element={broker(<BrokerProfile />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
