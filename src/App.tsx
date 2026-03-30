import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { useUser } from './hooks/useUser';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Shipments from './pages/Shipments';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Orders from './pages/Orders';
import LRManagement from './pages/LRManagement';
import Legal from './pages/Legal';

export default function App() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={(user && !user.needsProfile) ? <Navigate to="/app" /> : <Landing />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/login" element={(!user || user.needsProfile) ? <Login /> : <Navigate to="/app" />} />

        <Route
          path="/app/*"
          element={
            (user && !user.needsProfile) ? (
              <Layout user={user}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/shipments" element={<Shipments />} />
                  <Route path="/lrs" element={<LRManagement />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/app" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
