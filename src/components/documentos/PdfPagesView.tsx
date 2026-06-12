import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Render every page of a PDF as <canvas> stacked vertically so the page scroll
// (not an iframe) controls navigation. Avoids the mobile issue where the
// embedded PDF viewer captures touch scroll and blocks the parent dialog.
export function PdfPagesView({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        // Worker
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const loadingTask = pdfjs.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const containerWidth = container.clientWidth || 600;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth - 4) / viewport.width;
          const scaled = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });

          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.marginBottom = "8px";
          canvas.style.background = "white";
          canvas.style.borderRadius = "4px";
          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
        }
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        console.error("PDF render error", e);
        if (!cancelled) {
          setError("No se pudo mostrar el PDF. Tocá 'Abrir / descargar' para verlo.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-sm text-destructive p-3">{error}</p>}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
