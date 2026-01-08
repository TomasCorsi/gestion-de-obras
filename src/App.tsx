import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Obras from "./pages/Obras";
import Cotizaciones from "./pages/Cotizaciones";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
          <Route path="/clientes" element={<Placeholder title="Clientes" subtitle="Gestión de clientes y contactos" />} />
          <Route path="/personal" element={<Placeholder title="Personal" subtitle="Gestión de empleados y roles" />} />
          <Route path="/maquinarias" element={<Placeholder title="Maquinarias" subtitle="Control de equipos y flota" />} />
          <Route path="/viajes" element={<Placeholder title="Viajes" subtitle="Registro de viajes y transporte" />} />
          <Route path="/remitos" element={<Placeholder title="Remitos" subtitle="Gestión de remitos y entregas" />} />
          <Route path="/combustible" element={<Placeholder title="Combustible" subtitle="Control de cargas de combustible" />} />
          <Route path="/mantenimiento" element={<Placeholder title="Mantenimiento" subtitle="Gestión de mantenimiento de equipos" />} />
          <Route path="/reportes" element={<Placeholder title="Reportes" subtitle="Análisis y estadísticas" />} />
          <Route path="/configuracion" element={<Placeholder title="Configuración" subtitle="Ajustes del sistema" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
