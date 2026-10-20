import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import logo from "@/assets/logo-full.png";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[App] No se pudo abrir la pantalla", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-5 px-6 text-center">
        <img src={logo} alt="Calamina Sur" className="w-48 h-auto" />
        <h1 className="text-xl font-semibold">No se pudo abrir la aplicación</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Verificá tu conexión e intentá nuevamente. Tus borradores no se borraron.</p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Volver a intentar
        </Button>
      </main>
    );
  }
}