import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComprobantesTab } from "@/components/contabilidad/ComprobantesTab";
import { PagosTab } from "@/components/contabilidad/PagosTab";
import { AsientosTab } from "@/components/contabilidad/AsientosTab";
import { ReportesTab } from "@/components/contabilidad/ReportesTab";
import { ConfigTab } from "@/components/contabilidad/ConfigTab";
import { PeriodosTab } from "@/components/contabilidad/PeriodosTab";
import { LibrosTab } from "@/components/contabilidad/LibrosTab";

export default function Contabilidad() {
  const [tab, setTab] = useState("ventas");
  return (
    <MainLayout title="Contabilidad" subtitle="Ventas, compras, pagos, asientos, períodos, libros e IVA">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full max-w-5xl h-auto">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="pagos">Pagos / Cobranzas</TabsTrigger>
          <TabsTrigger value="asientos">Asientos</TabsTrigger>
          <TabsTrigger value="periodos">Ejercicios</TabsTrigger>
          <TabsTrigger value="libros">Libros</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="ventas" className="mt-4">
          <ComprobantesTab esVenta={true} />
        </TabsContent>
        <TabsContent value="compras" className="mt-4">
          <ComprobantesTab esVenta={false} />
        </TabsContent>
        <TabsContent value="pagos" className="mt-4">
          <PagosTab />
        </TabsContent>
        <TabsContent value="asientos" className="mt-4">
          <AsientosTab />
        </TabsContent>
        <TabsContent value="periodos" className="mt-4">
          <PeriodosTab />
        </TabsContent>
        <TabsContent value="libros" className="mt-4">
          <LibrosTab />
        </TabsContent>
        <TabsContent value="reportes" className="mt-4">
          <ReportesTab />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
