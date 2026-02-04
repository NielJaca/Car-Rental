import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CarDetails from './pages/CarDetails';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCars from './pages/admin/AdminCars';
import AdminAvailability from './pages/admin/AdminAvailability';
import AdminBookings from './pages/admin/AdminBookings';
import AdminLayout from './components/AdminLayout';
import BackendBanner from './components/BackendBanner';

function App() {
  return (
    <>
      <BackendBanner />
      <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="car/:id" element={<CarDetails />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/login" replace />} />
        <Route path="login" element={<AdminLogin />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="cars" element={<AdminCars />} />
        <Route path="availability" element={<AdminAvailability />} />
        <Route path="bookings" element={<AdminBookings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
