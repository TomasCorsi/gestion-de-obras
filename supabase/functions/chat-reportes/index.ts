import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_PROMPT = `Eres un asistente de reportes para una empresa de construcción y movimiento de suelos en Argentina. 
Respondés siempre en español argentino. Tenés acceso a la base de datos para consultar información.

TABLAS DISPONIBLES (schema public):

- obras (id uuid, nombre text, ubicacion text, descripcion text, estado estado_obra [activa|pendiente|finalizada|pausada], fecha_inicio date, fecha_fin_estimada date, cliente_id uuid, numero text)
- clientes (id uuid, nombre text, cuit text, direccion text, localidad text, telefono text, email text, activo boolean)
- personal (id uuid, nombre text, apellido text, dni text, rol rol_personal [administrador|supervisor|capataz|maquinista|chofer|administrativo|auditor|mecanico|ayudante|repartidor], legajo text, activo boolean, sueldo numeric, fecha_ingreso date)
- maquinarias (id uuid, codigo text, nombre text, tipo tipo_maquinaria, marca text, patente text, estado estado_maquinaria [operativa|mantenimiento|inactiva|en_uso], horas_acumuladas numeric, km_acumulados numeric, obra_id uuid)
- cotizaciones (id uuid, numero text, obra_id uuid, descripcion text, estado estado_cotizacion [borrador|enviada|aprobada|rechazada|vencida], fecha_creacion date, subtotal numeric, iva numeric, total numeric, moneda text)
- cotizacion_items (id uuid, cotizacion_id uuid, descripcion text, unidad text, cantidad numeric, precio_unitario numeric, subtotal numeric, categoria_id uuid)
- remitos (id uuid, numero text, fecha date, obra_id uuid, desde text, hasta text, material text, tipo_material text, cantidad numeric, unidad text, cantidad_viajes integer, precio_unitario numeric, precio_total numeric, maquinaria_id uuid, tipo_transporte text, cliente text, cliente_destino text)
- cargas_combustible (id uuid, fecha date, obra_id uuid, maquinaria_id uuid, litros numeric, precio_litro numeric, costo_total numeric, horas_maquina numeric, operador text)
- cargas_combustible_repartidor (id uuid, fecha date, maquinaria_id uuid, obra_id uuid, litros numeric, tipo_producto text, numero_remito integer, observaciones text)
- mantenimientos (id uuid, fecha date, maquinaria_id uuid, tipo tipo_mantenimiento [preventivo|correctivo|emergencia], descripcion text, costo_repuestos numeric, costo_mano_obra numeric, costo_total numeric, horas_maquina numeric, tecnico text, estado estado_mantenimiento [programado|en_proceso|completado])
- horas_maquina (id uuid, fecha date, maquinaria_id uuid, obra_id uuid, operador_id uuid, horas_trabajadas numeric)
- partes_diarios (id uuid, fecha date, personal_id uuid, obra_id uuid, maquinaria_id uuid, hora_entrada time, hora_salida time, horometro_inicio numeric, horometro_fin numeric, cantidad_viajes integer, estado text, novedades text, tareas text)
- otros_gastos (id uuid, fecha date, obra_id uuid, categoria text, descripcion text, monto numeric, proveedor text)
- viajes (id uuid, fecha date, obra_id uuid, chofer_id uuid, camion_id uuid, origen text, destino text, material text, volumen numeric, estado estado_viaje)
- certificados (id uuid, obra_id uuid, numero text, periodo text, estado estado_certificado, subtotal numeric, iva numeric, total numeric)
- certificado_items (id uuid, certificado_id uuid, descripcion text, unidad text, cantidad numeric, precio_unitario numeric, subtotal numeric)

RELACIONES CLAVE:
- obras.cliente_id → clientes.id
- remitos.obra_id → obras.id
- remitos.maquinaria_id → maquinarias.id
- cotizaciones.obra_id → obras.id
- cargas_combustible.obra_id → obras.id
- cargas_combustible.maquinaria_id → maquinarias.id
- mantenimientos.maquinaria_id → maquinarias.id
- horas_maquina.obra_id → obras.id
- horas_maquina.maquinaria_id → maquinarias.id
- partes_diarios.personal_id → personal.id
- partes_diarios.obra_id → obras.id
- partes_diarios.maquinaria_id → maquinarias.id

REGLAS:
- Solo generá queries SELECT. Nunca INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.
- Siempre poné LIMIT (máximo 100 filas).
- Usá JOINs para mostrar nombres legibles en vez de UUIDs.
- Formateá montos como pesos argentinos cuando corresponda.
- Respondé de forma concisa y con datos concretos.
- Si no podés responder con los datos disponibles, explicá por qué.
- La fecha actual es ${new Date().toISOString().split("T")[0]}.`;

async function executeQuery(sql: string, dbUrl: string): Promise<{ rows: any[]; error?: string }> {
  // Validate SQL is SELECT only
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return { rows: [], error: "Solo se permiten consultas SELECT" };
  }
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE"];
  for (const word of forbidden) {
    // Check for forbidden words as standalone tokens (not inside strings)
    const regex = new RegExp(`\\b${word}\\b`, "i");
    // Simple check - strip string literals first
    const stripped = sql.replace(/'[^']*'/g, "");
    if (regex.test(stripped)) {
      return { rows: [], error: `Operación ${word} no permitida` };
    }
  }

  // Force LIMIT if not present
  if (!normalized.includes("LIMIT")) {
    sql = sql.replace(/;?\s*$/, " LIMIT 100;");
  }

  try {
    // Use pg driver via Deno
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const pg = postgres(dbUrl, { max: 1 });
    const result = await pg.unsafe(sql);
    await pg.end();
    return { rows: Array.from(result) };
  } catch (e) {
    console.error("SQL execution error:", e);
    return { rows: [], error: e instanceof Error ? e.message : "Error ejecutando consulta" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const DB_URL = Deno.env.get("SUPABASE_DB_URL");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!DB_URL) throw new Error("SUPABASE_DB_URL not configured");

    const aiMessages = [
      { role: "system", content: SCHEMA_PROMPT },
      ...messages,
    ];

    // First call: let AI decide if it needs to query
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "ejecutar_consulta_sql",
              description: "Ejecuta una consulta SQL SELECT contra la base de datos de la empresa para obtener datos reales",
              parameters: {
                type: "object",
                properties: {
                  sql: { type: "string", description: "Query SQL SELECT a ejecutar" },
                  explicacion: { type: "string", description: "Breve explicación de qué busca la consulta" },
                },
                required: ["sql"],
              },
            },
          },
        ],
      }),
    });

    if (!firstResponse.ok) {
      const status = firstResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intentá de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const firstData = await firstResponse.json();
    const firstChoice = firstData.choices?.[0]?.message;

    // If no tool call, return the response directly (streaming the final answer)
    if (!firstChoice?.tool_calls?.length) {
      const content = firstChoice?.content || "No pude procesar tu consulta.";
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute SQL queries from tool calls
    const toolResults: any[] = [];
    for (const toolCall of firstChoice.tool_calls) {
      if (toolCall.function.name === "ejecutar_consulta_sql") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log("Executing SQL:", args.sql);
        const result = await executeQuery(args.sql, DB_URL);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result.error ? { error: result.error } : { rows: result.rows, count: result.rows.length }),
        });
      }
    }

    // Second call: let AI interpret the results with streaming
    const secondMessages = [
      ...aiMessages,
      firstChoice,
      ...toolResults,
    ];

    const secondResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: secondMessages,
        stream: true,
      }),
    });

    if (!secondResponse.ok) {
      throw new Error(`AI gateway error on second call: ${secondResponse.status}`);
    }

    return new Response(secondResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-reportes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
