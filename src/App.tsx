import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NoAccess from "./pages/NoAccess";
import Obras from "./pages/Obras";
import Cotizaciones from "./pages/Cotizaciones";

import Personal from "./pages/Personal";
import Maquinarias from "./pages/Maquinarias";
import Viajes from "./pages/Viajes";
import Remitos from "./pages/Remitos";
import Combustible from "./pages/Combustible";
import Mantenimiento from "./pages/MantenimientoPage";
import Stock from "./pages/Stock";
import Presentismo from "./pages/Presentismo";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
