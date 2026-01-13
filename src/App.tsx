import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
const Obras = lazy(() => import("./pages/Obras"));
const Cotizaciones = lazy(() => import("./pages/Cotizaciones"));
const Personal = lazy(() => import("./pages/Personal"));
const Maquinarias = lazy(() => import("./pages/Maquinarias"));
const Viajes = lazy(() => import("./pages/Viajes"));
const Remitos = lazy(() => import("./pages/Remitos"));
const Combustible = lazy(() => import("./pages/Combustible"));
const Mantenimiento = lazy(() => import("./pages/MantenimientoPage"));
const Stock = lazy(() => import("./pages/Stock"));
const Presentismo = lazy(() => import("./pages/Presentismo"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Cargando...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/olvide-contrasena" element={<ForgotPassword />} />
              <Route path="/restablecer-contrasena" element={<ResetPassword />} />
              <Route path="/sin-acceso" element={<NoAccess />} />
              <Route path="/install" element={<Install />} />

              {/* Protected routes - All authenticated users */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/obras" element={<ProtectedRoute><Obras /></ProtectedRoute>} />
              <Route path="/viajes" element={<ProtectedRoute><Viajes /></ProtectedRoute>} />
              <Route path="/remitos" element={<ProtectedRoute><Remitos /></ProtectedRoute>} />
              <Route path="/combustible" element={<ProtectedRoute><Combustible /></ProtectedRoute>} />
              <Route path="/mantenimiento" element={<ProtectedRoute><Mantenimiento /></ProtectedRoute>} />
              <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
              <Route path="/presentismo" element={<ProtectedRoute><Presentismo /></ProtectedRoute>} />

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
