import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RecentObras } from "@/components/dashboard/RecentObras";
import { MaquinariasStatus } from "@/components/dashboard/MaquinariasStatus";
import { ViajesChart } from "@/components/dashboard/ViajesChart";
import { CotizacionesPendientes } from "@/components/dashboard/CotizacionesPendientes";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  Building2,
  Truck,
  Route,
  DollarSign,
  Users,
  FileText,
} from "lucide-react";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export default function Dashboard() {
  const {
    loading,
    stats,
    obrasRecientes,
    maquinarias,
    cotizaciones,
    viajesSemana,
  } = useDashboardData();

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Panel de control principal"
    >
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Obras Activas"
          value={stats.obrasActivas}
          subtitle={`${obrasRecientes.length} registradas`}
          icon={Building2}
          variant="primary"
        />
        <KPICard
          title="Maquinarias"
          value={stats.maquinariasTotal}
          subtitle={`${stats.maquinariasOperativas} operativas`}
          icon={Truck}
          variant="success"
        />
        <KPICard
          title="Viajes Hoy"
          value={stats.viajesHoy}
          subtitle={`${stats.volumenHoy.toLocaleString()} m³ transportados`}
          icon={Route}
          variant="default"
        />
        <KPICard
          title="Cotizaciones"
          value={stats.cotizacionesPendientes}
          subtitle="Pendientes de respuesta"
          icon={FileText}
          variant="warning"
        />
        <KPICard
          title="Personal Activo"
          value={stats.personalActivo}
          subtitle="Total registrado"
          icon={Users}
          variant="default"
        />
        <KPICard
          title="Facturación"
          value={formatCurrency(stats.facturacionMes)}
          subtitle="Cotizaciones aprobadas"
          icon={DollarSign}
          variant="primary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Obras */}
        <div className="lg:col-span-2">
          <RecentObras obras={obrasRecientes} loading={loading} />
        </div>

        {/* Right Column - Maquinarias */}
        <div>
          <MaquinariasStatus maquinarias={maquinarias} loading={loading} />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ViajesChart data={viajesSemana} loading={loading} />
        <CotizacionesPendientes cotizaciones={cotizaciones} loading={loading} />
      </div>
    </MainLayout>
  );
}
