import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { useUser } from './hooks/useUser';
import { ToastProvider } from './contexts/ToastContext';
import { DataProvider } from './contexts/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Legal from './pages/Legal';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Shipments = lazy(() => import('./pages/Shipments'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Orders = lazy(() => import('./pages/Orders'));
const LRManagement = lazy(() => import('./pages/LRManagement'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

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
    <ToastProvider>
    <Router>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={(user && !user.needsProfile) ? <Navigate to="/app" /> : <Landing />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/login" element={(!user || user.needsProfile) ? <Login /> : <Navigate to="/app" />} />

        <Route
          path="/app/*"
          element={
            (user && !user.needsProfile) ? (
              <DataProvider>
                <Layout user={user}>
                  <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
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
                  </Suspense>
                  </ErrorBoundary>
                </Layout>
              </DataProvider>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </ErrorBoundary>
    </Router>
    </ToastProvider>
  );
}
