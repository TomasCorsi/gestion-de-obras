import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Obras from "./pages/Obras";
import Cotizaciones from "./pages/Cotizaciones";
import Clientes from "./pages/Clientes";
import Personal from "./pages/Personal";
import Maquinarias from "./pages/Maquinarias";
import Viajes from "./pages/Viajes";
import Remitos from "./pages/Remitos";
import Combustible from "./pages/Combustible";
import Mantenimiento from "./pages/MantenimientoPage";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
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
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/personal" element={<Personal />} />
          <Route path="/maquinarias" element={<Maquinarias />} />
          <Route path="/viajes" element={<Viajes />} />
          <Route path="/remitos" element={<Remitos />} />
          <Route path="/combustible" element={<Combustible />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
