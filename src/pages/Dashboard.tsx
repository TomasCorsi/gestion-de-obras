import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RecentObras } from "@/components/dashboard/RecentObras";
import { MaquinariasStatus } from "@/components/dashboard/MaquinariasStatus";
import { ViajesChart } from "@/components/dashboard/ViajesChart";
import { CotizacionesPendientes } from "@/components/dashboard/CotizacionesPendientes";
import {
  Building2,
  Truck,
  Route,
  DollarSign,
  Users,
  FileText,
} from "lucide-react";

export default function Dashboard() {
  return (
    <MainLayout
      title="Dashboard"
      subtitle="Panel de control principal"
    >
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Obras Activas"
          value={8}
          subtitle="2 iniciando esta semana"
          icon={Building2}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="Maquinarias"
          value={12}
          subtitle="9 operativas"
          icon={Truck}
          variant="success"
        />
        <KPICard
          title="Viajes Hoy"
          value={24}
          subtitle="1,280 m³ transportados"
          icon={Route}
          variant="default"
          trend={{ value: 8, isPositive: true }}
        />
        <KPICard
          title="Cotizaciones"
          value={4}
          subtitle="Pendientes de respuesta"
          icon={FileText}
          variant="warning"
        />
        <KPICard
          title="Personal Activo"
          value={32}
          subtitle="En obras hoy"
          icon={Users}
          variant="default"
        />
        <KPICard
          title="Facturación Mes"
          value="$4.2M"
          subtitle="Enero 2026"
          icon={DollarSign}
          variant="primary"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Obras */}
        <div className="lg:col-span-2">
          <RecentObras />
        </div>

        {/* Right Column - Maquinarias */}
        <div>
          <MaquinariasStatus />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ViajesChart />
        <CotizacionesPendientes />
      </div>
    </MainLayout>
  );
}
