import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Rewards from "./pages/Rewards";
import AppointmentManagement from "./pages/AppointmentManagement";
import PatientManagement from "./pages/PatientManagement";
import Onboarding from "./pages/Onboarding";
import VerifyEmail from "./pages/VerifyEmail";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Inventory from "./pages/Inventory";
import Register from "./pages/Register";
import AuthCallback from './pages/AuthCallback';

import Sales from "./pages/Sales";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/register" element={<Register />} />
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          } />
          <Route path="/appointments" element={
            <ProtectedRoute>
              <AppointmentManagement />
            </ProtectedRoute>
          } />
          <Route path="/patients" element={
            <ProtectedRoute>
              <PatientManagement />
            </ProtectedRoute>
          } />
          <Route path="/rewards" element={
            <ProtectedRoute>
              <Rewards />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
