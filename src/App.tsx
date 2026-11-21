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
import AcceptInvite from "./pages/AcceptInvite";
import TwoStepSetup from "./pages/TwoStepSetup";
import TwoStepVerify from "./pages/TwoStepVerify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ClinicalRecord from "./pages/ClinicalRecord";
import ClinicalNote from "./pages/ClinicalNote";
import IntakeOnDevice from "./pages/IntakeOnDevice";
import IntakeByLink from "./pages/IntakeByLink";
import AuthCallback from './pages/AuthCallback';
import { PracticeProvider, usePractice } from "./context/PracticeContext";
import { ConfigProvider } from "antd";
import { resolveBrand } from "./lib/branding";

/** Gives the antd tables (Sales) the practice's colour and the app's font, instead of antd blue. */
const AntdTheme = ({ children }: { children: React.ReactNode }) => {
  const { practice } = usePractice();
  const { primary } = resolveBrand({ primary: practice?.brand_primary_color, accent: practice?.brand_accent_color });
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primary,
          colorLink: primary,
          fontFamily: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
          borderRadius: 8,
          colorBorderSecondary: "#ECEAE6",
        },
        components: {
          Table: { headerBg: "#F9F8F6", headerColor: "#6A6E78", rowHoverBg: "#FBFAF8" },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

import Sales from "./pages/Sales";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PracticeProvider>
        <AntdTheme>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route path="/two-step/setup" element={<TwoStepSetup />} />
          <Route path="/two-step/verify" element={<TwoStepVerify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/intake/:token" element={<IntakeByLink />} />
          <Route path="/patients/:patientId/record" element={<ProtectedRoute><ClinicalRecord /></ProtectedRoute>} />
          <Route path="/patients/:patientId/notes/new" element={<ProtectedRoute><ClinicalNote /></ProtectedRoute>} />
          <Route path="/patients/:patientId/notes/:noteId" element={<ProtectedRoute><ClinicalNote /></ProtectedRoute>} />
          <Route path="/patients/:patientId/intake/new" element={<ProtectedRoute><IntakeOnDevice /></ProtectedRoute>} />
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
        </AntdTheme>
        </PracticeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
