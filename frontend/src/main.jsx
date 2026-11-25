import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import Login from './pages/Login';
import './styles.css';
function Protected() {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading />;
  return user ? (
    <Layout />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  );
}
function App() {
  const { checking } = useAuth();
  if (checking) return <Loading />;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route
            path="*"
            element={
              <div className="state">
                <h1>Page not found</h1>
                <p>This page doesn’t exist.</p>
                <Link className="button primary" to="/dashboard">
                  Back to overview
                </Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </>
  );
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
