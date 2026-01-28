import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SessionKeepAlive } from "@/components/auth/SessionKeepAlive";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

// Eagerly loaded pages (critical path)
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NoAccess from "./pages/NoAccess";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import ParteDiario from "./pages/ParteDiario";

// Lazy loaded pages (code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Obras = lazy(() => import("./pages/Obras"));
const Cotizaciones = lazy(() => import("./pages/Cotizaciones"));
const Personal = lazy(() => import("./pages/Personal"));
const Maquinarias = lazy(() => import("./pages/Maquinarias"));
const Viajes = lazy(() => import("./pages/Viajes"));
const Remitos = lazy(() => import("./pages/Remitos"));
const Gastos = lazy(() => import("./pages/Gastos"));
const Mantenimiento = lazy(() => import("./pages/MantenimientoPage"));
const Stock = lazy(() => import("./pages/Stock"));
const RegistroEmpleado = lazy(() => import("./pages/RegistroEmpleado"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});

import { LoadingScreen } from "@/components/shared/LoadingScreen";

// Loading fallback component
const PageLoader = () => <LoadingScreen />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdatePrompt />
      <BrowserRouter>
        <AuthProvider>
          <SessionKeepAlive />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/registro-empleado" element={<RegistroEmpleado />} />
              <Route path="/olvide-contrasena" element={<ForgotPassword />} />
              <Route path="/restablecer-contrasena" element={<ResetPassword />} />
              <Route path="/sin-acceso" element={<NoAccess />} />
              <Route path="/install" element={<Install />} />

              {/* Protected routes - Main roles (not ayudante) */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/obras" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <Obras />
                </ProtectedRoute>
              } />
              <Route path="/viajes" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <Viajes />
                </ProtectedRoute>
              } />
              <Route path="/remitos" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <Remitos />
                </ProtectedRoute>
              } />
              {/* Gastos - accessible to all including ayudante */}
              <Route path="/gastos" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista', 'ayudante']}>
                  <Gastos />
                </ProtectedRoute>
              } />
              <Route path="/mantenimiento" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <Mantenimiento />
                </ProtectedRoute>
              } />
              <Route path="/stock" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <Stock />
                </ProtectedRoute>
              } />
              <Route path="/parte-diario" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista']}>
                  <ParteDiario />
                </ProtectedRoute>
              } />

              {/* Protected routes - Admin and Capataz only */}
              <Route path="/cotizaciones" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz']}>
                  <Cotizaciones />
                </ProtectedRoute>
              } />
              <Route path="/personal" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz']}>
                  <Personal />
                </ProtectedRoute>
              } />
              <Route path="/maquinarias" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz']}>
                  <Maquinarias />
                </ProtectedRoute>
              } />
              <Route path="/reportes" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz']}>
                  <Reportes />
                </ProtectedRoute>
              } />

              {/* Protected routes - Admin only */}
              <Route path="/configuracion" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Configuracion />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
