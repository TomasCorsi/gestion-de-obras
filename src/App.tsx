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
import { OfflineBanner } from "@/components/pwa/OfflineBanner";

// Eagerly loaded pages (critical path)
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NoAccess from "./pages/NoAccess";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (code splitting)
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Obras = lazy(() => import("./pages/Obras"));
const Cotizaciones = lazy(() => import("./pages/Cotizaciones"));
const CertificadosPage = lazy(() => import("./pages/Certificados"));
const Personal = lazy(() => import("./pages/Personal"));
const Maquinarias = lazy(() => import("./pages/Maquinarias"));
const Viajes = lazy(() => import("./pages/Viajes"));
const Remitos = lazy(() => import("./pages/Remitos"));
const Gastos = lazy(() => import("./pages/Gastos"));
const Mantenimiento = lazy(() => import("./pages/MantenimientoPage"));
const Stock = lazy(() => import("./pages/Stock"));
const ParteDiario = lazy(() => import("./pages/ParteDiario"));
const RegistroEmpleado = lazy(() => import("./pages/RegistroEmpleado"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const MiPerfil = lazy(() => import("./pages/MiPerfil"));
const Clientes = lazy(() => import("./pages/Clientes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // No recargar al volver a la pestaña
      staleTime: 5 * 60 * 1000, // 5 minutos - datos frescos más tiempo
      retry: 1,
      refetchOnReconnect: true, // Sí recargar al reconectar internet
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
          <OfflineBanner />
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
              {/* Admin-only routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/obras" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Obras />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/viajes" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Viajes />
                </ProtectedRoute>
              } />
              <Route path="/remitos" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Remitos />
                </ProtectedRoute>
              } />
              <Route path="/gastos" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Gastos />
                </ProtectedRoute>
              } />
              <Route path="/mantenimiento" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Mantenimiento />
                </ProtectedRoute>
              } />
              <Route path="/stock" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Stock />
                </ProtectedRoute>
              } />
              <Route path="/cotizaciones" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Cotizaciones />
                </ProtectedRoute>
              } />
              <Route path="/certificados" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <CertificadosPage />
                </ProtectedRoute>
              } />
              <Route path="/personal" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Personal />
                </ProtectedRoute>
              } />
              <Route path="/maquinarias" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Maquinarias />
                </ProtectedRoute>
              } />
              <Route path="/reportes" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Reportes />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Configuracion />
                </ProtectedRoute>
              } />

              {/* Parte Diario - accessible to all authenticated roles */}
              <Route path="/parte-diario" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista', 'ayudante']}>
                  <ParteDiario />
                </ProtectedRoute>
              } />

              {/* Mi Perfil - accessible to all authenticated users */}
              <Route path="/mi-perfil" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista', 'ayudante']}>
                  <MiPerfil />
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
