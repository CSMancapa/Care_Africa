import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/auth/Onboarding';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Patients from './pages/Patients';
import DashboardLayout from './components/layout/DashboardLayout';
import Appointments from './pages/Appointments';
import Loyalty from './pages/Loyalty';
import Settings from './pages/Settings';
import BillingClaims from './pages/BillingClaims';
import { Chatbot } from './pages/Chatbot';
import RoleSelection from './components/RoleSelection';
import PatientAuth from './pages/auth/PatientAuth';
import PatientLogin from './components/PatientLogin';
import PatientSignup from './components/PatientSignup';
import EmailVerification from './components/EmailVerification';
import PatientOnboarding from './pages/auth/PatientOnboarding';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="patients" element={<Patients />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="loyalty" element={<Loyalty />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="billing" element={<BillingClaims />} />
                </Route>
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;